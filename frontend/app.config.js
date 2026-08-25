// app.json stays the static source of truth. This file only overrides
// android.googleServicesFile at build time: EAS Build downloads the
// GOOGLE_SERVICES_JSON secret file env var to a local path and exposes
// that path via this env var, since the real file is gitignored and
// can't be picked up from the repo the way a plain app.json path would be.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android.googleServicesFile,
  },
});
