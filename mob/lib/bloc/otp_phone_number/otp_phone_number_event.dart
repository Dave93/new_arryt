part of 'otp_phone_number_bloc.dart';

abstract class OtpPhoneNumberEvent extends Equatable {
  const OtpPhoneNumberEvent();

  @override
  List<Object> get props => [];
}

class OtpPhoneNumberChanged extends OtpPhoneNumberEvent {
  const OtpPhoneNumberChanged({required this.phoneNumber});

  final String phoneNumber;

  @override
  List<Object> get props => [phoneNumber];
}
