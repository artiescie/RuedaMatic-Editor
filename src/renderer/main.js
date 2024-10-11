import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'

// BEGIN rc mod
import 'vue-awesome/icons'
import Icon from 'vue-awesome/components/Icon'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import Simplert from 'vue2-simplert-plugin'
import VueI18n from 'vue-i18n'
import PulseLoader from 'vue-spinner/src/PulseLoader.vue'

// LANGUAGE files per module: INCOMPLETE, small test only was done
// node ~/Development/IdeaProjects/command-line-js/prop2yaml.js ~/Downloads/Moves.zip ~/Development/IdeaProjects/ruedamatic-editor/src/renderer/components/Moves/

// DETECT language of browser, see https://github.com/Binaryify/vue-tetris
//  not relevant for electron apps:
// export const lan = (() => {
//   let l = getParam('lan').toLowerCase()
//   if (!l && navigator.languages) {
//     l = navigator.languages.find(l => i18nJSON.lan.indexOf(l) !== -1)
//   }
//   l = i18nJSON.lan.indexOf(l) === -1 ? i18nJSON.default : l
//   return l
// })()

// require must be after imports for ESLint
require('vue2-simplert-plugin/dist/vue2-simplert-plugin.css')

Vue.use(BootstrapVue)
Vue.use(Simplert)
Vue.use(VueI18n)

Vue.component('v-icon', Icon)
// END   rc mod

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

// 06022018 https://github.com/vue-perf-devtool/vue-perf-devtool
Vue.config.devtools = true
Vue.config.performance = true

// only need an instance if we are setting options;
//  and then, we have to add it to Vue instance options below
const i18n = new VueI18n({
  locale: 'en'
})

Vue.component('pulse-loader', PulseLoader)

// suppress Electron Security Warnings including:
//    Node.js Integration with Remote Content
//    Disabled webSecurity
//    Insecure Resources
//    allowRunningInsecureContent
//    Insecure Content-Security-Policy
// see: https://www.electronjs.org/docs/latest/tutorial/security/
//    Anyway, this app does not require mil-spec security!
// NOTE: this may not work anyway:
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true' // suppress the security warnings

/* eslint-disable no-new */
new Vue({
  components: { App },
  i18n,
  router,
  store,
  template: '<App/>'
}).$mount('#app')
