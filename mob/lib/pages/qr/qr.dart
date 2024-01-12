import 'dart:convert';
import 'dart:developer';

import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:http/http.dart' as http;

@RoutePage()
class QRPage extends StatelessWidget {
  const QRPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return QRViewWidgetPage();
  }
}

class QRViewWidgetPage extends StatefulWidget {
  @override
  State<StatefulWidget> createState() => _QRViewWidgetState();
}

class _QRViewWidgetState extends State<QRViewWidgetPage> {
  Barcode? result;
  QRViewController? controller;
  bool isShowLoading = false;
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');

  // @override
  // void reassemble() {
  //   super.reassemble();
  //   if (Platform.isAndroid) {
  //     controller!.pauseCamera();
  //   }
  //   controller!.resumeCamera();
  // }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    Future.delayed(const Duration(microseconds: 200), () {
      print("resuming camera");
      controller?.resumeCamera();
      Future.delayed(const Duration(microseconds: 100), () {
        controller?.resumeCamera();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red.withOpacity(0),
      body: Stack(
        children: <Widget>[
          _buildQrView(context),
          Positioned(
            bottom: 0,
            left: 0,
            child: Container(
              color: Colors.red.withOpacity(0),
              height: 150,
              width: MediaQuery.of(context).size.width,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                mainAxisSize: MainAxisSize.max,
                children: <Widget>[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      Container(
                        margin: const EdgeInsets.all(8),
                        child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 30, vertical: 20)),
                            onPressed: () async {
                              await controller?.toggleFlash();
                              setState(() {});
                            },
                            child: FutureBuilder(
                              future: controller?.getFlashStatus(),
                              builder: (context, snapshot) {
                                return Icon(snapshot.data == false
                                    ? Icons.flash_off
                                    : Icons.flash_on);
                              },
                            )),
                      )
                    ],
                  ),
                ],
              ),
            ),
          ),
          isShowLoading
              ? Positioned.fill(
                  child: Container(
                      color: Colors.white.withOpacity(0.8),
                      width: double.infinity,
                      height: double.infinity,
                      child: const Center(child: CircularProgressIndicator())))
              : const SizedBox(),
        ],
      ),
    );
  }

  Widget _buildQrView(BuildContext context) {
    // For this example we check how width or tall the device is and change the scanArea and overlay accordingly.
    var scanArea = (MediaQuery.of(context).size.width < 400 ||
            MediaQuery.of(context).size.height < 400)
        ? 200.0
        : 300.0;
    // To ensure the Scanner view is properly sizes after rotation
    // we need to listen for Flutter SizeChanged notification and update controller
    return QRView(
      key: qrKey,
      onQRViewCreated: (controller) => _onQRViewCreated(controller, context),
      overlay: QrScannerOverlayShape(
          borderColor: Colors.red,
          borderRadius: 10,
          borderLength: 30,
          borderWidth: 10,
          cutOutSize: scanArea),
      onPermissionSet: (ctrl, p) => _onPermissionSet(context, ctrl, p),
    );
  }

  void _onQRViewCreated(QRViewController controller, BuildContext context) {
    setState(() {
      this.controller = controller;
    });
    controller.scannedDataStream.listen((scanData) async {
      await controller.pauseCamera();
      String data = scanData.code!;
      String hexString = scanData.code!;
      List<String> splitted = [];
      for (int i = 0; i < hexString.length; i = i + 2) {
        splitted.add(hexString.substring(i, i + 2));
      }
      String ascii = List.generate(splitted.length,
          (i) => String.fromCharCode(int.parse(splitted[i], radix: 16))).join();

      // remove first 6 characters from ascii
      String asciiWithoutFirst6 = ascii.substring(6);
      Codec<String, String> stringToBase64 = utf8.fuse(base64);
      // base64 decode
      String base64Decoded = stringToBase64.decode(asciiWithoutFirst6);
      print(base64Decoded);
      String apiUrl = base64Decoded.split("|")[0];
      String serviceName = base64Decoded.split("|")[1];
      setState(() {
        isShowLoading = true;
      });
      try {
        var response = await http.post(
          Uri.parse('https://$apiUrl/graphql'),
          headers: <String, String>{
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: '''
        {
          "query": "query {checkService {\\n result}}\\n",
          "variables": null
        }
        ''',
        );
        print(response.body);
        var result = jsonDecode(response.body);
        if (result['errors'] != null) {
          _onErrorServiceCheck(context);
        } else {
          _onSuccessServiceCheck(context, serviceName, apiUrl);
        }
      } catch (e) {
        print(e);
        _onErrorServiceCheck(context);
      }
    });
  }

  void _onPermissionSet(BuildContext context, QRViewController ctrl, bool p) {
    log('${DateTime.now().toIso8601String()}_onPermissionSet $p');
    if (!p) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('no Permission')),
      );
    }
  }

  void _onErrorServiceCheck(BuildContext context) {
    setState(() {
      isShowLoading = false;
    });
    showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: Text(
              AppLocalizations.of(context)!.error_label,
            ),
            content:
                Text(AppLocalizations.of(context)!.this_service_is_not_valid),
            actions: [
              TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    controller!.resumeCamera();
                  },
                  child: const Text('OK'))
            ],
          );
        });
  }

  Future<void> _onSuccessServiceCheck(
      BuildContext context, String serviceName, String apiUrl) async {
    setState(() {
      isShowLoading = false;
    });
    BlocProvider.of<ApiClientsBloc>(context).add(ApiClientsAdd(
        apiUrl: apiUrl, serviceName: serviceName, isServiceDefault: true));
    // context.read<ApiClientsBloc>().add(ApiClientsAdd(
    //     apiUrl: apiUrl, serviceName: serviceName, isServiceDefault: true));
    await Future.delayed(Duration.zero);
    await controller!.pauseCamera();
    controller!.dispose();
    AutoRouter.of(context).replaceNamed('/login/type-phone');
  }

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }
}
