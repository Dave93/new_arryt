import 'dart:io';

import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/models/organizations.dart';
import 'package:arryt/pages/callcenter/callcenter_webview.dart';
import 'package:auto_route/auto_route.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../bloc/block_imports.dart';

@RoutePage()
class CallCenterOrganizationsListPage extends StatelessWidget {
  const CallCenterOrganizationsListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: const CallCenterOrganizationsList());
  }
}

class CallCenterOrganizationsList extends StatefulWidget {
  const CallCenterOrganizationsList({super.key});

  @override
  State<CallCenterOrganizationsList> createState() =>
      _CallCenterOrganizationsListState();
}

class _CallCenterOrganizationsListState
    extends State<CallCenterOrganizationsList> {
  List<Organizations> organizations = [];

  Future<void> _loadOrganizations() async {
    UserDataBloc userDataBloc = context.read<UserDataBloc>();
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query {
        organizations {
          id
          name
          active
          description
          max_distance
          max_active_order_count
          max_order_close_distance
          support_chat_url
          icon_url
        }
      }
    ''';
    var data = await client.query(
      QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache),
    );

    if (data.data?['organizations'] != null) {}

    if (data.hasException) {
      print(data.exception);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(data.exception.toString()),
        ),
      );
    } else {
      List<Organizations> ordersStat = [];
      data.data?['organizations'].forEach((e) {
        ordersStat.add(Organizations.fromMap(e));
      });
      setState(() {
        organizations = ordersStat;
      });
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    // Enable virtual display.
    if (Platform.isAndroid) WebView.platform = AndroidWebView();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrganizations();
    });
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Выберите организацию'),
        centerTitle: true,
      ),
      body: ListView.builder(
        itemBuilder: (context, index) {
          return ListTile(
            title: Text(organizations[index].name),
            trailing: const Icon(Icons.arrow_forward_ios),
            leading: organizations[index].iconUrl != null
                ? Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: CachedNetworkImage(
                      height: 40,
                      imageUrl: organizations[index].iconUrl!,
                      progressIndicatorBuilder:
                          (context, url, downloadProgress) =>
                              CircularProgressIndicator(
                                  value: downloadProgress.progress),
                      errorWidget: (context, url, error) =>
                          const Icon(Icons.error),
                    ),
                  )
                : null,
            onTap: () {
              showMaterialModalBottomSheet(
                context: context,
                builder: (context) =>
                    CallCenterWebView(url: organizations[index].supportChatUrl),
              );
            },
          );
        },
        itemCount: organizations.length,
      ),
    );
  }
}
