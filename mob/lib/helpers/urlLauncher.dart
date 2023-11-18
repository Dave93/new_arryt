import 'package:url_launcher/url_launcher.dart';

Future<void> launchYandexNavi(double lat, double lon) async {
  final url = 'yandexnavi://build_route_on_map?lat_to=$lat&lon_to=$lon';
  if (await canLaunchUrl(Uri.parse(url))) {
    await launchUrl(Uri.parse(url));
  } else {
    await launchUrl(
        Uri.parse("https://mobile.yandex.ru/apps/android/navigator/"));
  }
}

Future<void> launchYandexMaps(
    double lat, double lon, double toLat, double toLon) async {
  final url =
      'yandexmaps://maps.yandex.ru/?rtext=$lat,$lon~$toLat,$toLon&rtt=pd';
  if (await canLaunchUrl(Uri.parse(url))) {
    await launchUrl(Uri.parse(url));
  } else {
    await launchUrl(Uri.parse("https://mobile.yandex.ru/apps/android/maps/"));
  }
}
