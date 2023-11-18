import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:loading_overlay/loading_overlay.dart';

import '../../helpers/api_graphql_provider.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import '../../models/notifications_model.dart';

class NotificationPage extends StatelessWidget {
  const NotificationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: const NotificationPageView());
  }
}

class NotificationPageView extends StatefulWidget {
  const NotificationPageView({super.key});

  @override
  State<NotificationPageView> createState() => _NotificationPageViewState();
}

class _NotificationPageViewState extends State<NotificationPageView> {
  late EasyRefreshController _controller;
  List<NotificationsModel> notifications = [];

  Future<void> _loadNotifications() async {
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query {
        myNotifications {
          id
          title
          body
          created_at
          send_at
          is_read
        }
      }
    ''';
    var result = await client.query(
        QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache));
    if (result.hasException) {
      throw result.exception!;
    }
    var data = result.data!['myNotifications'] as List;
    var notifications = data.map((e) => NotificationsModel.fromMap(e)).toList();
    setState(() {
      this.notifications = notifications;
    });
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    initializeDateFormatting();

    _controller = EasyRefreshController(
      controlFinishRefresh: true,
      controlFinishLoad: true,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadNotifications();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          centerTitle: true,
          title: Text(
              AppLocalizations.of(context)!.notificationsLabel.toUpperCase()),
        ),
        body: Padding(
          padding: const EdgeInsets.all(8.0),
          child: EasyRefresh(
            controller: _controller,
            header: const BezierCircleHeader(),
            onRefresh: () async {
              await _loadNotifications();
              _controller.finishRefresh();
              _controller.resetFooter();
            },
            child: notifications.length > 0
                ? ListView.builder(
                    itemCount: notifications.length,
                    itemBuilder: (context, index) {
                      return NotificationCardWidget(
                          id: notifications[index].id,
                          title: notifications[index].title,
                          body: notifications[index].body,
                          date: notifications[index].send_at,
                          isRead: notifications[index].isRead,
                          onRead: () {
                            Future.delayed(Duration(seconds: 1), () {
                              _loadNotifications();
                            });
                          });
                    },
                  )
                : SizedBox(
                    width: double.infinity,
                    height: double.infinity,
                    child: Center(
                      child: Text(
                          AppLocalizations.of(context)!.noNotificationsLabel),
                    ),
                  ),
          ),
        ));
  }
}

class NotificationCardWidget extends StatefulWidget {
  final String id;
  final String title;
  final String body;
  final DateTime date;
  final bool isRead;
  final void Function() onRead;

  NotificationCardWidget({
    required this.id,
    required this.title,
    required this.body,
    required this.date,
    required this.isRead,
    required this.onRead,
  });

  @override
  State<NotificationCardWidget> createState() => _NotificationCardWidgetState();
}

class _NotificationCardWidgetState extends State<NotificationCardWidget> {
  bool isLoading = false;

  Future<void> setReadNotification() async {
    setState(() {
      isLoading = true;
    });

    var client = GraphQLProvider.of(context).value;
    var query = r'''
      mutation ($id: String!) {
        markAsRead(id: $id) {
          id
        }
      }
    ''';
    await client.mutate(
        MutationOptions(document: gql(query), variables: <String, dynamic>{
      'id': widget.id,
    }));
    widget.onRead();
    Future.delayed(Duration(seconds: 1), () {
      setState(() {
        isLoading = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4.0,
      clipBehavior: Clip.antiAliasWithSaveLayer,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.0),
          side: BorderSide(color: Theme.of(context).primaryColor, width: 1)),
      margin: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 6.0),
      child: Container(
        decoration: const BoxDecoration(color: Colors.white),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 10.0, right: 10.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    DateFormat.yMMMMd('ru').format(widget.date),
                    style: const TextStyle(fontSize: 12.0, color: Colors.grey),
                  )
                ],
              ),
            ),
            ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
              title: Text(
                widget.title,
                style: const TextStyle(
                  fontSize: 20.0,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                widget.body,
                style: const TextStyle(fontSize: 16.0),
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: widget.isRead
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 15.0),
                      child: Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.check,
                              color: Colors.green,
                            ),
                            const SizedBox(
                              width: 10.0,
                            ),
                            Text(
                              AppLocalizations.of(context)!.readAlreadyLabel,
                              style: const TextStyle(
                                  fontSize: 20.0, color: Colors.green),
                            )
                          ],
                        ),
                      ))
                  : ElevatedButton(
                      style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).primaryColor),
                      onPressed: () {
                        setReadNotification();
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 15.0),
                        child: isLoading
                            ? const CircularProgressIndicator()
                            : Text(AppLocalizations.of(context)!
                                .readLabel
                                .toUpperCase()),
                      )),
            )
          ],
        ),
      ),
    );
  }
}
