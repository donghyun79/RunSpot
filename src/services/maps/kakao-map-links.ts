import * as Linking from 'expo-linking';

import { ExternalRouteRequest, ReturnRouteMode } from './types';

const KAKAO_ROUTE_WEB_BASE_URL = 'http://m.map.kakao.com/scheme/route';

const routeModeMap: Record<ReturnRouteMode, string> = {
  publictransit: 'publictransit',
  bicycle: 'bicycle',
  foot: 'foot',
};

function formatPointParam(latitude: number, longitude: number) {
  return `${latitude},${longitude}`;
}

export function buildKakaoMapRouteUrl({
  origin,
  destination,
  mode,
}: ExternalRouteRequest) {
  const originParam = formatPointParam(origin.latitude, origin.longitude);
  const destinationParam = formatPointParam(destination.latitude, destination.longitude);
  const by = routeModeMap[mode];

  return `kakaomap://route?sp=${originParam}&ep=${destinationParam}&by=${by}`;
}

export function buildKakaoMapRouteFallbackUrl({
  origin,
  destination,
  mode,
}: ExternalRouteRequest) {
  const originParam = formatPointParam(origin.latitude, origin.longitude);
  const destinationParam = formatPointParam(destination.latitude, destination.longitude);
  const by = routeModeMap[mode];
  const params = new URLSearchParams({
    sp: originParam,
    ep: destinationParam,
    by,
  });

  return `${KAKAO_ROUTE_WEB_BASE_URL}?${params.toString()}`;
}

export async function openKakaoMapRoute(request: ExternalRouteRequest) {
  const appUrl = buildKakaoMapRouteUrl(request);

  if (await Linking.canOpenURL(appUrl)) {
    await Linking.openURL(appUrl);
    return;
  }

  await Linking.openURL(buildKakaoMapRouteFallbackUrl(request));
}
