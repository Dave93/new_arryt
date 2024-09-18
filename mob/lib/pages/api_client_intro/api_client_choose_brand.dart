import 'dart:convert';

import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/models/api_client.dart';
import 'package:arryt/models/brands.dart';
import 'package:auto_route/auto_route.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:loading_overlay/loading_overlay.dart';

import '../../bloc/block_imports.dart';

class ApiClientChooseBrand extends StatefulWidget {
  const ApiClientChooseBrand({super.key});

  @override
  State<ApiClientChooseBrand> createState() => _ApiClientChooseBrandState();
}

class _ApiClientChooseBrandState extends State<ApiClientChooseBrand> {
  List<BrandsModel> _brands = [];
  bool isLoading = false;

  Future<void> _loadBrands() async {
    setState(() {
      isLoading = true;
    });

    ApiServer api = ApiServer();

    // get brands from api
    Response response = await api.get('/api/brands/cached', {});

    setState(() {
      isLoading = false;
      _brands = (response.data as List<dynamic>)
          .map((e) => BrandsModel.fromMap(e as Map<String, dynamic>))
          .toList();
    });
  }

  Future<void> selectBrand(BrandsModel brand) async {
    setState(() {
      isLoading = true;
    });

    ApiServer api = ApiServer();
    try {
      Response response = await api.get('/check_service', {});
      print(response);
      if (response.data['result'] != 'ok') {
        _onErrorServiceCheck(context);
        return;
      } else {
        _onSuccessServiceCheck(context, brand.name, brand.apiUrl);
        return;
      }
    } catch (e) {
      print(e);
      _onErrorServiceCheck(context);
    }
  }

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBrands();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewPadding.bottom;
    return Scaffold(
        backgroundColor: Theme.of(context).primaryColor,
        body: LoadingOverlay(
          isLoading: isLoading,
          child: Column(
            children: [
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: AutoSizeText('Выберите\n бренд'.toUpperCase(),
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headline3!.copyWith(
                        color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 180,
                child: ListView.builder(
                  shrinkWrap: true,
                  scrollDirection: Axis.horizontal,
                  itemCount: _brands.length,
                  itemBuilder: (context, index) {
                    var brand = _brands[index];
                    return GestureDetector(
                      child: Padding(
                        padding: EdgeInsets.only(
                            top: 20.0,
                            bottom: 45 + bottom,
                            right: 20,
                            left: 20),
                        child: Card3DWidget(card: brand),
                      ),
                      onTap: () => selectBrand(brand),
                    );
                  },
                ),
              ),
              const Spacer(),
            ],
          ),
        ));
  }

  void _onErrorServiceCheck(BuildContext context) {
    setState(() {
      isLoading = false;
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
                  },
                  child: const Text('OK'))
            ],
          );
        });
  }

  Future<void> _onSuccessServiceCheck(
      BuildContext context, String serviceName, String apiUrl) async {
    setState(() {
      isLoading = false;
    });

    ApiClient apiClient = ApiClient(
        apiUrl: apiUrl, serviceName: serviceName, isServiceDefault: true);

    HiveHelper.setDefaultApiClient(apiClient);

    await Future.delayed(Duration.zero);
    AutoRouter.of(context).replaceNamed('/login/type-phone');
  }
}

class Card3DWidget extends StatelessWidget {
  const Card3DWidget({Key? key, this.card}) : super(key: key);

  final BrandsModel? card;

  @override
  Widget build(BuildContext context) {
    final border = BorderRadius.circular(15.0);
    return PhysicalModel(
      color: Colors.white,
      elevation: 10,
      borderRadius: border,
      child: ClipRRect(
        borderRadius: border,
        child: Image.network(
          card!.logoPath,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
