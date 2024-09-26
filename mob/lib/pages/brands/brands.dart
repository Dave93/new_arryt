import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

@RoutePage()
class BrandsPage extends StatelessWidget {
  const BrandsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // AppBar with back button and title
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
          onPressed: () {
            context.router.maybePop();
          },
        ),
        title: Text(AppLocalizations.of(context)!.choose_brand.toUpperCase(),
            style: const TextStyle(color: Colors.black)),
      ),
      body: Column(
        children: [
          //create brands list
          Expanded(
            child: ListView.builder(
              itemCount: 10,
              itemBuilder: (context, index) {
                return
                    //create brand item
                    Container(
                  margin: const EdgeInsets.all(10),
                  child: Row(
                    children: [
                      //create brand image
                      Container(
                        width: 100,
                        height: 100,
                        decoration: const BoxDecoration(
                          image: DecorationImage(
                            image: AssetImage(
                                'assets/images/api_clients_intro.png'),
                            fit: BoxFit.cover,
                          ),
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                        ),
                      ),
                      const SizedBox(width: 20),
                      //create brand name
                      Container(
                        margin: const EdgeInsets.only(left: 10),
                        child: const Text(
                          'Brand name',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          //create save button
          Container(
            margin: const EdgeInsets.all(10),
            child: ElevatedButton(
              onPressed: () {
                context.router.pushNamed('/qr');
              },
              child: Text(AppLocalizations.of(context)!.add),
            ),
          ),
        ],
      ),
    );
  }
}
