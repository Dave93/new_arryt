import 'dart:async';

import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart'; // Add this import
import 'package:arryt/models/user_data.dart';
import 'package:arryt/riverpods/otp_phone/provider.dart';
import 'package:arryt/riverpods/otp_token/provider.dart';
import 'package:auto_route/auto_route.dart';
import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pin_code_fields/pin_code_fields.dart';
import 'package:rounded_loading_button_plus/rounded_loading_button.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:animated_snack_bar/animated_snack_bar.dart';

import '../../widgets/wave/wave_widget.dart';

@RoutePage()
class LoginTypeOtpPage extends ConsumerStatefulWidget {
  const LoginTypeOtpPage({super.key});

  @override
  ConsumerState<LoginTypeOtpPage> createState() => _LoginTypeOtpPageState();
}

class _LoginTypeOtpPageState extends ConsumerState<LoginTypeOtpPage> {
  final RoundedLoadingButtonController _btnController =
      RoundedLoadingButtonController();
  TextEditingController textEditingController = TextEditingController();
  // ..text = "123456";

  // ignore: close_sinks
  StreamController<ErrorAnimationType>? errorController;

  bool isLoading = false;

  @override
  Widget build(BuildContext context) {
    final messaging = FirebaseMessaging.instance;
    final size = MediaQuery.of(context).size;
    final bool keyboardOpen = MediaQuery.of(context).viewInsets.bottom > 0;
    String code = "";
    String signature = "{{ app signature }}";
    String phoneNumber = ref.watch(otpPhoneProviderProvider);
    String otpToken = ref.watch(otpTokenProviderProvider);

    Future<void> _verifyOtpCode() async {
      var code = textEditingController.text;

      if (isLoading) {
        return;
      }
      _btnController.start();
      setState(() {
        isLoading = true;
      });

      if (code.length < 6) {
        _btnController.error();
        AnimatedSnackBar.material(
          AppLocalizations.of(context)!.otpCodeError,
          type: AnimatedSnackBarType.error,
        ).show(context);
        setState(() {
          isLoading = false;
        });
        Future.delayed(const Duration(milliseconds: 1000)).then((value) {
          _btnController.reset();
        });
        return;
      }

      // ApiClientsBloc apiClientsBloc = BlocProvider.of<ApiClientsBloc>(context);
      // OtpPhoneNumberBloc otpPhoneNumberBloc =
      //     BlocProvider.of<OtpPhoneNumberBloc>(context);
      // OtpTokenBloc otpTokenBloc = BlocProvider.of<OtpTokenBloc>(context);

      print('phoneNumber ${phoneNumber}');
      print('otpToken ${otpToken}');
      // get first isServiceDefault client
      // ApiClients? apiClient = apiClientsBloc.state.apiClients
      //     .firstWhere((element) => element.isServiceDefault == true);
      String? fcmToken;

      try {
        // Request permission (required for iOS)
        await messaging.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );

        // Get the token
        fcmToken = await messaging.getToken();
      } catch (e) {
        fcmToken = null;
      }

      Map<String, dynamic> requestParams = {
        'verificationKey': otpToken,
        'phone': phoneNumber,
        'otp': code,
      };
      if (fcmToken != null) {
        requestParams['deviceToken'] = fcmToken;
      }

      ApiServer api = new ApiServer();
      try {
        Response response =
            await api.post('/api/users/verify-otp', requestParams);

        if (response.statusCode == 200) {
          if (response.data['errors'] != null) {
            setState(() {
              isLoading = false;
            });
            _btnController.error();
            AnimatedSnackBar.material(
              AppLocalizations.of(context)!.otpCodeError,
              type: AnimatedSnackBarType.error,
            ).show(context);
            Future.delayed(const Duration(milliseconds: 1000)).then((value) {
              _btnController.reset();
            });
            return;
          }

          setState(() {
            isLoading = false;
          });
          _btnController.success();

          UserData user = UserData.fromMap(response.data);
          // Replace objectBox.setUserData with HiveHelper
          HiveHelper.setUserData(user);
          Future.delayed(const Duration(milliseconds: 200)).then((value) {
            _btnController.reset();
          });
          AutoRouter.of(context).pushNamed('/home');
        } else {
          setState(() {
            isLoading = false;
          });
          _btnController.error();
          Future.delayed(const Duration(milliseconds: 200)).then((value) {
            _btnController.reset();
          });
        }
      } catch (e) {
        setState(() {
          isLoading = false;
        });
        _btnController.error();
        AnimatedSnackBar.material(
          AppLocalizations.of(context)!.otpCodeError,
          type: AnimatedSnackBarType.error,
        ).show(context);
        Future.delayed(const Duration(milliseconds: 1000)).then((value) {
          _btnController.reset();
        });
        return;
      }

      // send phone number to server
      // String requestBody;
      // if (fcmToken != null) {
      //   requestBody = '''
      // {
      //   "query": "mutation {verifyOtp(phone: \\"$phoneNumber\\", otp: \\"$code\\", verificationKey: \\"$otpToken\\", deviceToken: \\"$fcmToken\\") {\\n access {\\nadditionalPermissions\\nroles {\\nname\\ncode\\nactive\\n}\\n}\\ntoken {\\naccessToken\\naccessTokenExpires\\nrefreshToken\\ntokenType\\n}\\nuser {\\nfirst_name\\nid\\nis_super_user\\nlast_name\\nis_online\\npermissions {\\nactive\\nslug\\nid\\n}\\nphone\\n}\\n}}\\n",
      //   "variables": null
      // }
      // ''';
      // } else {
      //   requestBody = '''
      // {
      //   "query": "mutation {verifyOtp(phone: \\"$phoneNumber\\", otp: \\"$code\\", verificationKey: \\"$otpToken\\") {\\n access {\\nadditionalPermissions\\nroles {\\nname\\ncode\\nactive\\n}\\n}\\ntoken {\\naccessToken\\naccessTokenExpires\\nrefreshToken\\ntokenType\\n}\\nuser {\\nfirst_name\\nid\\nis_super_user\\nlast_name\\nis_online\\npermissions {\\nactive\\nslug\\nid\\n}\\nphone\\n}\\n}}\\n",
      //   "variables": null
      // }
      // ''';
      // }

      // var response = await http.post(
      //   Uri.parse("https://${apiClient.apiUrl}/graphql"),
      //   headers: {'Content-Type': 'application/json'},
      //   body: requestBody,
      // );
      // if (response.statusCode == 200) {
      //   var result = jsonDecode(response.body);

      //   if (result['errors'] != null) {
      //     setState(() {
      //       isLoading = false;
      //     });
      //     _btnController.error();
      //     AnimatedSnackBar.material(
      //       AppLocalizations.of(context)!.otpCodeError,
      //       type: AnimatedSnackBarType.error,
      //     ).show(context);
      //     Future.delayed(const Duration(milliseconds: 1000)).then((value) {
      //       _btnController.reset();
      //     });
      //     return;
      //   }

      //   setState(() {
      //     isLoading = false;
      //   });
      //   _btnController.success();
      //   UserDataBloc userDataBloc = BlocProvider.of<UserDataBloc>(context);
      //   userDataBloc.add(UserDataEventChange(
      //     accessToken: result['data']['verifyOtp']['token']['accessToken'],
      //     refreshToken: result['data']['verifyOtp']['token']['refreshToken'],
      //     accessTokenExpires: result['data']['verifyOtp']['token']
      //         ['accessTokenExpires'],
      //     userProfile:
      //         UserProfileModel.fromMap(result['data']['verifyOtp']['user']),
      //     permissions: List.from(
      //         result['data']['verifyOtp']['access']['additionalPermissions']),
      //     roles: List<Role>.from(result['data']['verifyOtp']['access']['roles']
      //         .map((x) => Role.fromMap(x))
      //         .toList()),
      //     is_online: result['data']['verifyOtp']['user']['is_online'],
      //     // parse 1h to duration
      //     tokenExpires: DateTime.now().add(Duration(
      //         hours: int.parse(result['data']['verifyOtp']['token']
      //                 ['accessTokenExpires']
      //             .split('h')[0]))),
      //   ));
      //   Future.delayed(const Duration(milliseconds: 200)).then((value) {
      //     _btnController.reset();
      //   });
      //   AutoRouter.of(context).pushNamed('/home');
      // } else {
      //   setState(() {
      //     isLoading = false;
      //   });
      //   _btnController.error();
      //   Future.delayed(const Duration(milliseconds: 200)).then((value) {
      //     _btnController.reset();
      //   });
      // }
    }

    @override
    void initState() {
      errorController = StreamController<ErrorAnimationType>();
      super.initState();
    }

    @override
    void dispose() {
      errorController!.close();
      super.dispose();
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          Container(
            height: size.height - 200,
            color: Theme.of(context).primaryColor,
          ),
          AnimatedPositioned(
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutQuad,
            top: keyboardOpen ? -size.height / 6 : 0.0,
            child: WaveWidget(
              size: size,
              yOffset: size.height / 2,
              color: Colors.white,
            ),
          ),
          Padding(
              padding: const EdgeInsets.only(top: 50, left: 20),
              child: GestureDetector(
                onTap: () {
                  AutoRouter.of(context).maybePop();
                },
                child: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: Colors.white,
                  size: 25,
                ),
              )),
          Padding(
            padding: const EdgeInsets.only(top: 130),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('arryt',
                  style: GoogleFonts.comfortaa(
                      fontSize: 90,
                      fontWeight: FontWeight.w700,
                      color: Colors.white))
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(30.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                PinCodeTextField(
                  appContext: context,
                  length: 6,
                  obscureText: false,
                  animationType: AnimationType.fade,
                  pinTheme: PinTheme(
                    shape: PinCodeFieldShape.box,
                    borderRadius: BorderRadius.circular(5),
                    fieldHeight: 50,
                    fieldWidth: 40,
                    activeFillColor: Colors.white,
                    selectedColor: Theme.of(context).primaryColor,
                    inactiveColor: Theme.of(context).primaryColor,
                  ),
                  animationDuration: const Duration(milliseconds: 300),
                  keyboardType: TextInputType.number,
                  obscuringCharacter: '*',
                  // enableActiveFill: true,
                  enablePinAutofill: true,
                  errorAnimationController: errorController,
                  controller: textEditingController,
                  onCompleted: (v) {
                    _verifyOtpCode();
                  },
                  onChanged: (value) {},
                  beforeTextPaste: (text) {
                    //if you return true then it will show the paste confirmation dialog. Otherwise if false, then nothing will happen.
                    //but you can show anything you want here, like your pop up saying wrong paste format or etc
                    return true;
                  },
                ),
                const SizedBox(
                  height: 20,
                ),
                RoundedLoadingButton(
                  controller: _btnController,
                  onPressed: _verifyOtpCode,
                  color: Theme.of(context).primaryColor,
                  child: Text(
                      AppLocalizations.of(context)!.sigin_in.toUpperCase(),
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium!
                          .copyWith(color: Colors.white)),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
