import 'package:arryt/helpers/api_error_message.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

DioException serverError(String message) =>
    DioException(error: message, requestOptions: RequestOptions(path: '/api/users/send-otp'));

Future<String> messageFor(WidgetTester tester, Object error, Locale locale) async {
  late String result;
  await tester.pumpWidget(MaterialApp(
    locale: locale,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Builder(builder: (context) {
      result = apiErrorMessage(context, error);
      return const SizedBox();
    }),
  ));
  return result;
}

void main() {
  testWidgets('дневной лимит — понятный текст на языке приложения', (tester) async {
    final e = serverError('Daily OTP limit reached. Try again later.');
    expect(await messageFor(tester, e, const Locale('uz')), contains('limiti tugadi'));
    expect(await messageFor(tester, e, const Locale('ru')), contains('Лимит SMS-кодов'));
  });

  testWidgets('cooldown, истёкший код и попытки', (tester) async {
    expect(await messageFor(tester, serverError('OTP already sent recently. Try again in a minute.'), const Locale('ru')),
        contains('через минуту'));
    expect(await messageFor(tester, serverError('OTP Expired'), const Locale('ru')), contains('истёк'));
    expect(await messageFor(tester, serverError('Too many attempts. Request a new OTP.'), const Locale('ru')),
        contains('Слишком много попыток'));
  });

  testWidgets('сетевой сбой не показывает текст исключения', (tester) async {
    final e = serverError('DioException [connection error]: SocketException: Failed host lookup');
    expect(await messageFor(tester, e, const Locale('ru')), contains('Нет связи'));
  });

  testWidgets('неизвестный ответ сервера показывается как есть, без текста — «Xato»', (tester) async {
    expect(await messageFor(tester, serverError('User is blocked'), const Locale('uz')), 'User is blocked');
    expect(await messageFor(tester, Exception('x'), const Locale('uz')), 'Xato');
  });
}
