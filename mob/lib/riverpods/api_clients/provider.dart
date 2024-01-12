import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../bloc/block_imports.dart';

part 'provider.g.dart';

@riverpod
class ApiClientsProvider extends _$ApiClientsProvider {
  @override
  List<ApiClients> build() => [];
}
