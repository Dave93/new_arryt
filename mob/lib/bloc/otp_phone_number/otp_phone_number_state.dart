part of 'otp_phone_number_bloc.dart';

abstract class OtpPhoneNumberState extends Equatable {
  final String phoneNumber;
  const OtpPhoneNumberState({
    required this.phoneNumber,
  });

  @override
  List<Object> get props => [];
}

class OtpPhoneNumberInitial extends OtpPhoneNumberState {
  const OtpPhoneNumberInitial({required super.phoneNumber});
}
