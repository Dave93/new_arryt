part of 'otp_token_bloc.dart';

abstract class OtpTokenState extends Equatable {
  final String token;
  const OtpTokenState({
    required this.token,
  });

  @override
  List<Object> get props => [token];
}

class OtpTokenInitial extends OtpTokenState {
  const OtpTokenInitial({required String token}) : super(token: token);
}
