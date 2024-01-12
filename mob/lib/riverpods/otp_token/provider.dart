import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../bloc/block_imports.dart';

part 'provider.g.dart';

@Riverpod(keepAlive: true)
class OtpTokenProvider extends _$OtpTokenProvider {
  @override
  String build() => '';

  void setToken(String token) {
    state = token;
  }
}
