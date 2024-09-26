import 'package:auto_route/auto_route.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class ApiClientIntroPage extends StatelessWidget {
  const ApiClientIntroPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Expanded(
                flex: 2,
                child: Image.asset('assets/images/api_clients_intro.png'),
              ),
              Expanded(
                  child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: AutoSizeText(
                      AppLocalizations.of(context)!.app_clients_intro_title,
                      style: Theme.of(context).textTheme.titleLarge,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    child: AutoSizeText(
                      AppLocalizations.of(context)!
                          .app_clients_intro_description,
                      style: Theme.of(context).textTheme.titleMedium,
                      textAlign: TextAlign.center,
                      maxLines: 3,
                    ),
                  ),
                  const Spacer(),
                  // Container(
                  //   child: RoundedButton(
                  //     onPressed: () {
                  //       Navigator.of(context).push(MaterialPageRoute(
                  //         builder: (context) => const QRViewWidget(),
                  //       ));
                  //     },
                  //     title: AppLocalizations.of(context)!.scan,
                  //   ),
                  // ),
                  InkWell(
                    onTap: () {
                      AutoRouter.of(context).pushNamed('/qr');
                    },
                    child: Container(
                      height: 50,
                      decoration: BoxDecoration(
                        color: Theme.of(context).primaryColor,
                        borderRadius: BorderRadius.circular(40),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.grey.withOpacity(0.4),
                            spreadRadius: 3,
                            blurRadius: 4,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(context)!.scan.toUpperCase(),
                          style: Theme.of(context).textTheme.titleMedium,
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  ),
                ],
              ))
            ],
          ),
        ),
      ),
    );
  }
}
