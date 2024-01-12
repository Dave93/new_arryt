import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

part 'otp_phone_number_event.dart';
part 'otp_phone_number_state.dart';

class OtpPhoneNumberBloc
    extends Bloc<OtpPhoneNumberEvent, OtpPhoneNumberState> {
  OtpPhoneNumberBloc() : super(const OtpPhoneNumberInitial(phoneNumber: '')) {
    on<OtpPhoneNumberEvent>((event, emit) {
      // TODO: implement event handler
    });
    on<OtpPhoneNumberChanged>((event, emit) {
      emit(OtpPhoneNumberInitial(phoneNumber: event.phoneNumber));
    });
  }
}
