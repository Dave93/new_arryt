import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';

/// Translates known server error messages to localized versions
String translateServerError(BuildContext context, String errorMessage) {
  final locale = Localizations.localeOf(context).languageCode;

  // Map of known server errors to translations
  final errorTranslations = {
    'You are too far from terminal': {
      'en': 'You are too far from branch',
      'ru': 'Вы слишком далеко от филиала',
      'uz': 'Siz filialdan juda uzoqdasiz',
    },
    'Error: You are too far from terminal': {
      'en': 'You are too far from branch',
      'ru': 'Вы слишком далеко от филиала',
      'uz': 'Siz filialdan juda uzoqdasiz',
    },
    'You have active orders': {
      'en': 'You have active orders',
      'ru': 'У вас есть активные заказы',
      'uz': 'Sizda faol buyurtmalar bor',
    },
    'You are not assigned to any terminal': {
      'en': 'You are not assigned to any branch',
      'ru': 'Вы не привязаны ни к одному филиалу',
      'uz': 'Siz hech qanday filialga biriktirilmagansiz',
    },
    'Order already taken': {
      'en': 'Order already taken',
      'ru': 'Заказ уже принят',
      'uz': 'Buyurtma allaqachon qabul qilingan',
    },
    'You are offline': {
      'en': 'You are offline',
      'ru': 'Вы не на линии',
      'uz': 'Siz oflayn holatdasiz',
    },
    'You are too far from order': {
      'en': 'You are too far from the customer',
      'ru': 'Вы слишком далеко от клиента',
      'uz': 'Siz mijozdan juda uzoqdasiz',
    },
    'Time entry already opened by another courier': {
      'en': 'Shift already opened by another courier',
      'ru': 'Смена уже открыта другим курьером',
      'uz': 'Smena boshqa kuryer tomonidan ochilgan',
    },
    'Time entry already opened': {
      'en': 'Shift already opened',
      'ru': 'Смена уже открыта',
      'uz': 'Smena allaqachon ochilgan',
    },
    'Courier balance not found': {
      'en': 'Courier balance not found',
      'ru': 'Баланс курьера не найден',
      'uz': 'Kuryer balansi topilmadi',
    },
    'User is not courier': {
      'en': 'User is not a courier',
      'ru': 'Пользователь не является курьером',
      'uz': 'Foydalanuvchi kuryer emas',
    },
  };

  // Check if we have a translation for this error
  for (final entry in errorTranslations.entries) {
    if (errorMessage.toLowerCase().contains(entry.key.toLowerCase())) {
      return entry.value[locale] ?? entry.value['en'] ?? errorMessage;
    }
  }

  // Clean up DioException prefix if present
  if (errorMessage.startsWith('DioException')) {
    // Try to extract the actual message
    final match = RegExp(r'Error:\s*(.+)').firstMatch(errorMessage);
    if (match != null) {
      final extractedMessage = match.group(1)?.trim();
      if (extractedMessage != null) {
        // Check again with extracted message
        for (final entry in errorTranslations.entries) {
          if (extractedMessage.toLowerCase().contains(entry.key.toLowerCase())) {
            return entry.value[locale] ?? entry.value['en'] ?? extractedMessage;
          }
        }
        return extractedMessage;
      }
    }
  }

  return errorMessage;
}
