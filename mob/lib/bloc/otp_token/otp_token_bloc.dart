import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

part 'otp_token_event.dart';
part 'otp_token_state.dart';

class OtpTokenBloc extends Bloc<OtpTokenEvent, OtpTokenState> {
  OtpTokenBloc() : super(const OtpTokenInitial(token: '')) {
    on<OtpTokenEvent>((event, emit) {
      // TODO: implement event handler
    });
    on<OtpTokenChanged>((event, emit) {
      emit(OtpTokenInitial(token: event.token));
    });
  }
}
