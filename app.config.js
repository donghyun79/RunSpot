const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];
  const reactNativeMapsConfig = {};

  if (androidGoogleMapsApiKey) {
    reactNativeMapsConfig.androidGoogleMapsApiKey = androidGoogleMapsApiKey;
  }

  if (iosGoogleMapsApiKey) {
    reactNativeMapsConfig.iosGoogleMapsApiKey = iosGoogleMapsApiKey;
  }

  if (Object.keys(reactNativeMapsConfig).length > 0) {
    plugins.push(['react-native-maps', reactNativeMapsConfig]);
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'com.runspot.mobile',
      buildNumber: config.ios?.buildNumber ?? '1',
      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocationWhenInUseUsageDescription:
          'RunSpot은 현재 위치를 사용해 러닝 출발지를 설정하고 주변 편의시설을 보여줍니다.',
      },
    },
    android: {
      ...config.android,
      package: config.android?.package ?? 'com.runspot.mobile',
      versionCode: config.android?.versionCode ?? 1,
    },
    plugins,
  };
};
