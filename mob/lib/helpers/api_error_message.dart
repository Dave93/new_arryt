import 'package:arryt/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';

/// Текст ошибки входа для курьера вместо общего «Xato».
///
/// ApiServer.post пробрасывает DioException, в `error` которого — `message`
/// из ответа сервера (на английском). Известные ответы переводим на язык
/// приложения, неизвестные показываем как есть, а без текста — `fallback`.
String apiErrorMessage(BuildContext context, Object error, {String? fallback}) {
  final l10n = AppLocalizations.of(context)!;
  final raw = error is DioException && error.error is String ? (error.error as String).trim() : '';
  final text = raw.toLowerCase();

  if (text.contains('daily otp limit')) return l10n.otp_error_daily_limit;
  if (text.contains('sent recently')) return l10n.otp_error_cooldown;
  if (text.contains('too many attempts')) return l10n.otp_error_too_many_attempts;
  if (text.contains('otp expired')) return l10n.otp_error_expired;
  if (text.contains('already used')) return l10n.otp_error_used;
  if (text.contains('otp not matched')) return l10n.otpCodeError;
  // Сетевые сбои приходят как toString() самого исключения — его не показываем.
  if (text.contains('socketexception') ||
      text.contains('connection') ||
      text.contains('timeout') ||
      text.contains('dioexception')) {
    return l10n.otp_error_network;
  }
  if (raw.isNotEmpty) return raw;
  return fallback ?? l10n.error_label;
}
