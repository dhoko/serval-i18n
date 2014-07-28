module.exports = ['$rootScope', '$http', function ($rootScope, $http) {

    var config = {};
    var i18n = {
        current: "",
        data: {},
        available: [],
        currentState: "",
        active: false,
        previousLang: config.lang,
        stateLoaded: false
    };

    /**
     * Load your url from lazy mode
     * @return {String} url
     */
    function loadLazyDefaultUrl() {

        var url = config.url;
        if(config.lazy) {
            url = config.urls.filter(function (o) {
                return o.lang === config.lang;
            })[0].url;
        }
        return url;
    }

    /**
     * Build i18n.data.
     * @param  {Object} data Data from the translation file
     */
    function buildI18n(data) {

        if(!config.lazy) {
            i18n.data = data;
            return;
        }

        i18n.data[i18n.current] = data;
    }

    /**
     * Load a translation to the $scope
     * - doc BCP 47 {@link http://tools.ietf.org/html/bcp47}
     * - doc Value of HTML5 lang attr {@link http://webmasters.stackexchange.com/questions/28307/value-of-the-html5-lang-attribute}
     * @param {String} lang Your language cf BCP 47
     */
    function setTranslation(page) {

        page = page || config.state;

        // Prevent too many digest
        if(i18n.currentState === page && i18n.stateLoaded && i18n.current === i18n.previousLang) {
          return;
        }

        i18n.currentState = page;
        i18n.active = true;

        var lang = i18n.current;
        var common = {}, currentPageTranslation = {};

        if(i18n.data[lang]) {

            /**
             * Prevent the error
             *     > TypeError: Cannot read property '$$hashKey' of undefined
             * cf {@link https://github.com/dhoko/ngBabelfish/issues/5}
             */
            if(!i18n.data[lang][page]) {
                i18n.data[lang][page] = {};

                if(config.log) {
                    console.warn('[ngBabelfish-babelfish@setTranslation] No translation available for the page %s for the lang %s',page, lang);
                }
            }

            angular.extend(common, i18n.data[lang]._common);
            currentPageTranslation = angular.extend(common, i18n.data[lang][page]);

            if(config.namespace) {
                $rootScope[config.namespace] = currentPageTranslation;
            }else {
                angular.extend($rootScope, currentPageTranslation);
            }

            $rootScope.$emit('ngBabelfish.translation:loaded', {
                currentState: page,
                lang: lang
            });

            i18n.stateLoaded = true;
        }
    }

    /**
     * Load a translation to the $scope for a language
     * - doc BCP 47 {@link http://tools.ietf.org/html/bcp47}
     * - doc Value of HTML5 lang attr {@link http://webmasters.stackexchange.com/questions/28307/value-of-the-html5-lang-attribute}
     * @trigger {Event} i18n:babelfish:changed {previous:XXX,value:XXX2}
     * @param {String} lang Your language cf BCP 47
     */
    function loadLanguage(lang) {

        var old = document.documentElement.lang;

        if(!old) {
            old = 'en';
        }

        // Find the current lang if it doesn't exist. Store the previous one too
        if(!lang) {
            lang = old + '-' + old.toUpperCase();
            i18n.previousLang = lang;
        }else {
            document.documentElement.lang = lang.split('-')[0];
            i18n.previousLang = old + '-' + old.toUpperCase();
        }

        config.lang = i18n.current = lang;

        $rootScope.$emit('ngBabelfish.translation:changed', {
            previous: (old + '-' + old.toUpperCase()),
            value: lang
        });

        // Load the new language if we do not already have it
        if(config.lazy && !i18n.data[lang]) {
            service.load();
        }

    }

    // Listen when you change the language in your application
    $rootScope.$on('ngBabelfish.translation:changed', function() {
        setTranslation(i18n.currentState);
    });

    var service = {

        init: function init(customConfig) {
            config = customConfig;
        },

        load: function load(url, name) {

            url = url || loadLazyDefaultUrl();

            // Set the default lang for the html
            if(!document.documentElement.lang && config.lang) {
                document.documentElement.lang = config.lang.split('-')[0];
            }

            var lang = config.lang || document.documentElement.lang + '-' + document.documentElement.lang.toUpperCase();

            if(i18n.data[i18n.current]) {
                return;
            }
            return $http.get(url)
                .error(function() {
                    alert("Cannot load i18n translation file");
                })
                .success(function (data) {

                    if(config.lazy) {
                        config.current = name;
                    }
                    i18n.current = lang;
                    buildI18n(data);

                    if(config.lazy) {
                        i18n.available = config.urls.map(function (item) {return item.lang;});
                    }else {
                        i18n.available = Object.keys(i18n.data);
                    }
                })
                .then(function() {
                    setTranslation(i18n.currentState);
                });
        },

        /**
         * Return the current state translation
         * @param  {String} lang
         * @return {Object}
         */
        get: function get(lang) {
            var currentLang = i18n.data[lang || i18n.current] || {},
                common = {};

            if(!currentLang[i18n.currentState]) {

                if(config.log) {
                    console.warn('[ngBabelfish-babelfish@get] No translation available for the page %s for the  lang %s',i18n.currentState, (lang || i18n.current));
                }
                currentLang[i18n.currentState] = {};
            }

            angular.extend(common, {}, currentLang._common);
            return angular.extend(common, currentLang[i18n.currentState]);
        },

        /**
         * Get all translations available for a lang
         * @param  {String} lang
         * @return {Object}
         */
        all: function all(lang) {
            return i18n.data[lang || i18n.current];
        },

        /**
         * Return each translations available for your app
         * @return {Object}
         */
        translations: function translations() {
          return i18n.data;
        },

        /**
         * Get the current Language
         * @return {String} lang
         */
        current: function current() {
            return i18n.current;
        },

        /**
         * Update translations for a state
         * @param  {String} state
         */
        updateState: setTranslation,

        /**
         * Update the lang for the application
         * It will load a new language
         * @param  {String} lang
         */
        updateLang: loadLanguage,

        /**
         * Check if we have loaded i18n
         * @return {Boolean}
         */
        isLoaded: function isLoaded() {
            return i18n.active;
        },

        /**
         * List each languages available for the application
         * @return {Array}
         */
        available: function available(){
            return i18n.available;
        },

        /**
         * Return the default event name in order to listen a new state||route
         * @return {String}
         */
        getEvent: function getEvent() {
            return config.eventName;
        }
    };

    return service;
}];