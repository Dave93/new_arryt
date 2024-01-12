import 'dart:convert';

import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/riverpods/otp_phone/provider.dart';
import 'package:arryt/riverpods/otp_token/provider.dart';
import 'package:auto_route/auto_route.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl_phone_number_input/intl_phone_number_input.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:rounded_loading_button/rounded_loading_button.dart';
import 'package:http/http.dart' as http;

import '../../widgets/wave/wave_widget.dart';

@RoutePage()
class LoginTypePhonePage extends ConsumerStatefulWidget {
  const LoginTypePhonePage({Key? key}) : super(key: key);

  @override
  ConsumerState<LoginTypePhonePage> createState() => _LoginTypePhonePageState();
}

class _LoginTypePhonePageState extends ConsumerState<LoginTypePhonePage> {
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  final TextEditingController controller = TextEditingController();
  final RoundedLoadingButtonController _btnController =
      RoundedLoadingButtonController();

  String initialCountry = 'UZ';

  PhoneNumber number = PhoneNumber(isoCode: 'UZ');

  String phoneNumber = '';
  bool isInputValid = false;

  void trySendPhoneNumber() async {
    if (isInputValid) {
      ref.read(otpPhoneProviderProvider.notifier).setPhoneNumber(phoneNumber);

      ApiServer api = new ApiServer();

      try {
        Response response = await api.post('/api/users/send-otp', {
          'phone': phoneNumber,
        });
        var details = response.data['details'];

        ref.read(otpTokenProviderProvider.notifier).setToken(details);

        _btnController.success();
        _btnController.reset();
        // zero delayed
        Future.delayed(const Duration(milliseconds: 200), () {
          AutoRouter.of(context).pushNamed('/login/type-otp');
        });
      } catch (e) {
        AnimatedSnackBar.material(
          AppLocalizations.of(context)!.error_label,
          type: AnimatedSnackBarType.error,
        ).show(context);
      }
    } else {
      // show snackbar with error

      _btnController.error();
      AnimatedSnackBar.material(
        AppLocalizations.of(context)!.typed_phone_incorrect,
        type: AnimatedSnackBarType.error,
      ).show(context);
      Future.delayed(const Duration(seconds: 1), () {
        _btnController.reset();
      });
      // _btnController.reset();
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final bool keyboardOpen = MediaQuery.of(context).viewInsets.bottom > 0;

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
                  ApiClientsBloc apiClientsBloc =
                      BlocProvider.of<ApiClientsBloc>(context);
                  apiClientsBloc
                      .add(const ApiClientsRemoveAllIsServiceDefault());
                  AutoRouter.of(context).pop();
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
                  InternationalPhoneNumberInput(
                    onInputChanged: (PhoneNumber number) {
                      setState(() {
                        phoneNumber = number.phoneNumber!;
                      });
                    },
                    onInputValidated: (bool value) {
                      setState(() {
                        isInputValid = value;
                      });
                    },
                    selectorConfig: const SelectorConfig(
                        selectorType: PhoneInputSelectorType.BOTTOM_SHEET,
                        showFlags: false,
                        setSelectorButtonAsPrefixIcon: true,
                        leadingPadding: 0),
                    errorMessage:
                        AppLocalizations.of(context)!.typed_phone_incorrect,
                    inputDecoration: InputDecoration(
                      labelText:
                          AppLocalizations.of(context)!.phone_field_label,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20)),
                    ),
                    // hintText: AppLocalizations.of(context)!.phone_field_label,
                    ignoreBlank: false,
                    autoValidateMode: AutovalidateMode.onUserInteraction,
                    selectorTextStyle:
                        TextStyle(color: Theme.of(context).primaryColor),
                    initialValue: number,
                    textFieldController: controller,
                    formatInput: true,
                    keyboardType: const TextInputType.numberWithOptions(
                        signed: true, decimal: true),
                    inputBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(40)),
                    onSaved: (PhoneNumber number) {},
                    countries: const ['UZ'],
                    countrySelectorScrollControlled: false,
                  ),
                  const SizedBox(
                    height: 20,
                  ),
                  RoundedLoadingButton(
                    controller: _btnController,
                    onPressed: trySendPhoneNumber,
                    color: Theme.of(context).primaryColor,
                    child: Text(
                        AppLocalizations.of(context)!.send_code.toUpperCase(),
                        style: Theme.of(context)
                            .textTheme
                            .button!
                            .copyWith(color: Colors.white)),
                  )
                ],
              )),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _btnController.reset();
    controller.dispose();
    super.dispose();
  }
}
