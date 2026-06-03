module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          // Polyfill import.meta for Hermes — @clerk/shared uses import.meta.env
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
