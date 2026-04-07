// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Production backend
  // apiBaseUrl: 'https://api.myserverdevops.com',
  // Local backend (for development)
  // apiBaseUrl: 'http://192.168.1.14:3000',
  apiBaseUrl: 'https://api.myserverdevops.com',
  // Same key as Cerca user app for ride detail map; restrict by HTTP referrer in Google Cloud Console
  googleMapsApiKey: 'AIzaSyDQq0QpnwQKzDR99ObP1frWj_uRTQ54pbo',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
