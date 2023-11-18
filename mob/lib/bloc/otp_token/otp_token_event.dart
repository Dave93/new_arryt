part of 'otp_token_bloc.dart';

abstract class OtpTokenEvent extends Equatable {
  const OtpTokenEvent();

  @override
  List<Object> get props => [];
}

class OtpTokenChanged extends OtpTokenEvent {
  const OtpTokenChanged({required this.token});

  final String token;

  @override
  List<Object> get props => [token];
}
