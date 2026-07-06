const { withPlugins } = require('@expo/config-plugins');

/**
 * Placeholder plugin for widget target metadata.
 * Real iOS widget target wiring still requires native Xcode target setup.
 */
module.exports = function withDailyVerseWidget(config, props = {}) {
  return withPlugins(config, [
    [
      (cfg) => {
        cfg.extra = cfg.extra || {};
        cfg.extra.dailyVerseWidget = {
          targetName: props.targetName || 'DailyVerseWidget',
          bundleIdentifier: props.bundleIdentifier || 'com.sozapp.widget',
        };
        return cfg;
      },
      {},
    ],
  ]);
};
