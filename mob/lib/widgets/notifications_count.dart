import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class NotificationsCountBadge extends StatelessWidget {
  const NotificationsCountBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return const NotificationsCountBadgeView();
  }
}

class NotificationsCountBadgeView extends StatefulWidget {
  const NotificationsCountBadgeView({super.key});

  @override
  State<NotificationsCountBadgeView> createState() =>
      _NotificationsCountBadgeViewState();
}

class _NotificationsCountBadgeViewState
    extends State<NotificationsCountBadgeView> {
  int notificationsCount = 0;

  Future<void> _loadUnreadNotificationCount() async {
    ApiServer api = new ApiServer();
    // var client = GraphQLProvider.of(context).value;
    try {
      var response = await api.get('/api/couriers/my_unread_notifications', {});
      setState(() {
        notificationsCount = response.data;
      });
    } catch (e) {
      print(e);
    }
    // var query = r'''
    //   query {
    //     myUnreadNotifications
    //   }
    // ''';
    // var result = await client.query(
    //     QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache));
    // if (result.hasException) {
    //   print(result.exception);
    // } else {
    //   setState(() {
    //     notificationsCount = result.data!['myUnreadNotifications'];
    //   });
    // }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      // run code after 1 second
      Future.delayed(Duration(seconds: 1), () {
        _loadUnreadNotificationCount();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      notificationsCount.toString(),
      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
    );
  }
}
