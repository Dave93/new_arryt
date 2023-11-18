import 'dart:convert';

import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/models/terminals.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:loading_overlay/loading_overlay.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:rounded_loading_button/rounded_loading_button.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../main.dart';
import '../../models/order.dart';

class BuildOrdersRoute extends StatelessWidget {
  const BuildOrdersRoute({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<OrderModel>>(
        stream: objectBox.getCurrentOrders(),
        builder: (context, snapshot) {
          if (snapshot.hasData) {
            if (snapshot.data!.isNotEmpty) {
              return BuildOrderRouteButton(orders: snapshot.data!);
            } else {
              return const SizedBox(height: 0);
            }
          } else {
            return const SizedBox(
              height: 0,
            );
          }
        });
  }
}

class BuildOrderRouteButton extends StatefulWidget {
  final List<OrderModel> orders;
  const BuildOrderRouteButton({super.key, required this.orders});

  @override
  State<BuildOrderRouteButton> createState() => _BuildOrderRouteButtonState();
}

class _BuildOrderRouteButtonState extends State<BuildOrderRouteButton> {
  final RoundedLoadingButtonController _btnController =
      RoundedLoadingButtonController();

  bool isLoading = false;

  Future<void> buildRouteForTerminal(Terminals terminal) async {
    setState(() {
      isLoading = true;
    });
    List<String> terminalOrders = widget.orders
        .where(
            (element) => element.terminal.target!.identity == terminal.identity)
        .map((e) => e.identity)
        .toList();

    var client = GraphQLProvider.of(context).value;

    var query = gql('''
      query (\$terminalId: String!, \$orderIds: [String!]!) {
        buildRouteForOrders(terminalId: \$terminalId, orderIds: \$orderIds)
      }
    ''');

    QueryResult result = await client.query(QueryOptions(
        document: query,
        variables: {
          'terminalId': terminal.identity,
          'orderIds': terminalOrders
        },
        cacheRereadPolicy: CacheRereadPolicy.mergeOptimistic,
        fetchPolicy: FetchPolicy.networkOnly));

    setState(() {
      isLoading = false;
    });
    if (result.hasException) {
      AnimatedSnackBar.material(
        result.exception?.graphqlErrors[0].message ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);

      return;
    }

    print(result.data);
    if (result.data != null) {
      Navigator.of(context).pop();
      await launchUrl(Uri.parse(result.data!['buildRouteForOrders']));
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
        child: RoundedLoadingButton(
            controller: _btnController,
            color: Theme.of(context).primaryColor,
            onPressed: () {
              _btnController.stop();
              _btnController.reset();

              List<Terminals> terminals =
                  widget.orders.map((e) => e.terminal.target!).toList();

              // convert each item to a string by using JSON encoding
              final jsonList =
                  terminals.map((item) => jsonEncode(item)).toList();

              // using toSet - toList strategy
              final uniqueJsonList = jsonList.toSet().toList();

              // convert each item back to the original form using JSON decoding
              terminals = uniqueJsonList
                  .map((item) => Terminals.fromJson(jsonDecode(item)))
                  .toList();
              showCupertinoModalBottomSheet(
                  expand: false,
                  context: context,
                  backgroundColor: Colors.transparent,
                  builder: (context) {
                    return Material(
                      child: SafeArea(
                          child: LoadingOverlay(
                        isLoading: isLoading,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              vertical: 10, horizontal: 10),
                          child: ListView(
                            shrinkWrap: true,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Flexible(
                                    child: AutoSizeText(
                                      'Выберите филиал, с которого построить маршрут',
                                      maxLines: 3,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  )
                                ],
                              ),
                              ...terminals
                                  .map((e) => ListTile(
                                        title: Text(e.name),
                                        onTap: () => buildRouteForTerminal(e),
                                      ))
                                  .toList()
                            ],
                          ),
                        ),
                      )),
                    );
                  });
            },
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.route_outlined),
                const SizedBox(width: 10),
                Text(AppLocalizations.of(context)!
                    .buildOrderRouteButton
                    .toUpperCase())
              ],
            )));
  }
}
