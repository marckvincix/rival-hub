const { withAppBuildGradle } = require('@expo/config-plugins');

// The iOS permission strings we localize per-language (NSCameraUsageDescription,
// NSPhotoLibraryUsageDescription — required for Apple's App Store review, see
// backend/server.py's Guideline 4 notes) go through app.json's shared cross-
// platform `locales` map. Expo's own config plugin mirrors every key in that
// map into Android's per-locale `values-b+XX/strings.xml` too, not just iOS's
// InfoPlist.strings — but never into the unqualified default `values/strings.xml`,
// since these keys don't correspond to anything Android-native. Android's release
// lint (`lintVitalRelease`, which App Bundle builds always run and treat as
// fatal) then fails the whole build with "ExtraTranslation": a string exists in
// a locale but not in the default one. The strings are functionally meaningless
// on Android — permission rationale text there comes from the OS's own system
// dialog, not app strings — so this only silences that one specific check.
module.exports = function withAndroidLintFix(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }
    const marker = "disable 'ExtraTranslation'";
    if (config.modResults.contents.includes(marker)) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /^android\s*\{/m,
      `android {\n    lintOptions {\n        ${marker}\n    }`
    );
    return config;
  });
};
