import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'provider.g.dart';

@Riverpod(keepAlive: true)
class OtpPhoneProvider extends _$OtpPhoneProvider {
  @override
  String build() => '';

  void setPhoneNumber(String phoneNumber) {
    state = phoneNumber;
  }
}
