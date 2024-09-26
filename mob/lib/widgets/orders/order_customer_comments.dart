import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:auto_route/auto_route.dart';
import 'package:chatview/chatview.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:arryt/models/customer_comments.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

@RoutePage()
class OrderCustomerCommentsPage extends StatelessWidget {
  const OrderCustomerCommentsPage(
      {super.key,
      @PathParam('customerId') required this.customerId,
      @PathParam('orderId') required this.orderId});
  final String customerId;
  final String orderId;

  @override
  Widget build(BuildContext context) {
    return OrderCustomerCommentsView(
      customerId: customerId,
      orderId: orderId,
    );
  }
}

class OrderCustomerCommentsView extends StatefulWidget {
  const OrderCustomerCommentsView(
      {super.key, required this.customerId, required this.orderId});
  final String customerId;
  final String orderId;

  @override
  State<OrderCustomerCommentsView> createState() =>
      _OrderCustomerCommentsViewState();
}

class _OrderCustomerCommentsViewState extends State<OrderCustomerCommentsView> {
  bool isLoading = true;
  List<CustomerCommentsModel> comments = [];
  List<Message> messages = [];
  final TextEditingController _controller = TextEditingController();
  final scrollController = ScrollController();

  final chatController = ChatController(
    initialMessageList: [],
    scrollController: ScrollController(),
    currentUser: ChatUser(id: '1', name: ''),
    otherUsers: [],
  );

  Future<void> _getCustomerComments() async {
    try {
      ApiServer apiServer = ApiServer();
      Response response =
          await apiServer.get('/api/orders/${widget.orderId}/comments', {});
      if (response.statusCode == 200) {
        setState(() {
          comments = (response.data as List)
              .map((e) => CustomerCommentsModel.fromMap(e))
              .toList();
        });
      }

      if (response.statusCode == 200) {
        if (response.data != null) {
          List<Message> resMessages = (response.data as List)
              .map((e) => CustomerCommentsModel.fromMap(e))
              .map(
            (e) {
              return Message(
                  id: e.id,
                  message: e.comment!,
                  sentBy: '1',
                  createdAt: e.created_at);
            },
          ).toList();

          resMessages.forEach((element) {
            chatController.addMessage(element);
          });

          // setState(() {
          //   comments = (response.data as List)
          //       .map((e) => CustomerCommentsModel.fromMap(e))
          //       .toList();
          //   messages = resMessages;
          // });
        }
      }

      setState(() {
        isLoading = false;
      });
    } on PlatformException catch (e) {
      AnimatedSnackBar.material(
        e.message ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    }
    setState(() {
      isLoading = false;
    });
  }

  Future<void> saveCustomerComment() async {
    // var comment = _controller.text;
    // try {
    //   var client = GraphQLProvider.of(context).value;
    //   var query = gql('''
    //   mutation {
    //     createCustomerComment(customerId: "${widget.customerId}", comment: "$comment") {
    //       id
    //       comment
    //       customer_id
    //       created_at
    //       customers_comments_voice_idToassets {
    //         id
    //         model
    //         file_name
    //         sub_folder
    //       }
    //       customers_comments_image_idToassets {
    //         id
    //         model
    //         file_name
    //         sub_folder
    //       }
    //     }
    //   }
    // ''');
    //   QueryResult result = await client.mutate(MutationOptions(
    //       document: query,
    //       cacheRereadPolicy: CacheRereadPolicy.mergeOptimistic,
    //       fetchPolicy: FetchPolicy.networkOnly));
    //   if (result.hasException) {
    //     AnimatedSnackBar.material(
    //       result.exception?.graphqlErrors[0].message ?? "Error",
    //       type: AnimatedSnackBarType.error,
    //     ).show(context);
    //   }

    //   if (result.data != null) {
    //     _controller.text = "";
    //     setState(() {
    //       comments.add(CustomerCommentsModel.fromMap(
    //           result.data!['createCustomerComment']));
    //     });
    //   }

    //   setState(() {
    //     isLoading = false;
    //   });
    // } on PlatformException catch (e) {
    //   AnimatedSnackBar.material(
    //     e.message ?? "Error",
    //     type: AnimatedSnackBarType.error,
    //   ).show(context);
    // }
    // setState(() {
    //   isLoading = false;
    // });
  }

  Widget addCommentWidget() {
    final bool keyboardOpen = MediaQuery.of(context).viewInsets.bottom > 0;
    return Container(
      color: Colors.grey.shade200,
      margin: EdgeInsets.only(bottom: keyboardOpen ? 0 : 10),
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 5.0),
      child: Row(children: [
        Expanded(
          child: TextField(
            controller: _controller,
            keyboardType: TextInputType.multiline,
            minLines: 1,
            maxLines: 3,
            decoration: InputDecoration(
              fillColor: Colors.white,
              filled: true,
              hintText:
                  AppLocalizations.of(context)!.customer_orders_type_comment,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(40.0),
                borderSide: BorderSide.none,
              ),
            ),
            onSubmitted: (value) {
              saveCustomerComment();
            },
          ),
        ),
        IconButton(
          icon: Icon(
            Icons.send,
            color: Theme.of(context).primaryColor,
            size: 30,
          ),
          onPressed: () {
            saveCustomerComment();
          },
        )
      ]),
    );
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getCustomerComments();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        appBar: AppBar(
          centerTitle: true,
          title: Text(AppLocalizations.of(context)!.order_card_comments),
        ),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    } else if (comments.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          centerTitle: true,
          title: Text(AppLocalizations.of(context)!.order_card_comments),
        ),
        body: Center(
          child: Text(AppLocalizations.of(context)!.no_comments),
        ),
        /*body: ChatScreen(
          messages: messages,
          sendMessageHintText:
              AppLocalizations.of(context)!.commentFieldLabel.toUpperCase(),
          senderColor: Theme.of(context).primaryColor,
          imageAttachmentFromGalary: AppLocalizations.of(context)!
              .chooseImageFromGallery
              .toUpperCase(),
          imageAttachmentFromCamery:
              AppLocalizations.of(context)!.chooseImageFromCamery.toUpperCase(),
          imageAttachmentCancelText: AppLocalizations.of(context)!
              .imageAttachmentCancelText
              .toUpperCase(),
          handleImageSelect: (p0) async {
            const uploadImage = r"""
                mutation uploadCustomerImageComment($file: Upload!, $customerId: String!) {
                  uploadCustomerImageComment(customerId: $customerId, file: $file) {
                    id
                  }
                }
                """;
            var bytes = p0.readAsBytes();
            var multipartFile = MultipartFile.fromBytes(
                'file', await bytes,
                filename: p0.name);
            var opts = MutationOptions(
              document: gql(uploadImage),
              variables: {
                "file": multipartFile,
                "customerId": widget.customerId
              },
            );
            var client = GraphQLProvider.of(context).value;

            var results = await client.mutate(opts);

            _getCustomerComments();
          },
          handleRecord: (path, canceled) async {
            if (!canceled) {
              const uploadImage = r"""
                mutation uploadCustomerVoiceComment($file: Upload!, $customerId: String!) {
                  uploadCustomerVoiceComment(customerId: $customerId, file: $file) {
                    id
                  }
                }
                """;
              var multipartFile = await MultipartFile.fromPath('file', path!,
                  contentType: MediaType("audio", "m4a"));
              var opts = MutationOptions(
                document: gql(uploadImage),
                variables: {
                  "file": multipartFile,
                  "customerId": widget.customerId
                },
              );
              var client = GraphQLProvider.of(context).value;

              var results = await client.mutate(opts);

              _getCustomerComments();
            }
          },
        ),
      */
      );
    } else {
      return Scaffold(
          resizeToAvoidBottomInset: true,
          appBar: AppBar(
            centerTitle: true,
            title: Text(AppLocalizations.of(context)!.order_card_comments),
          ),
          // body: Center(
          //   child: Text(AppLocalizations.of(context)!.no_comments),
          // )
          body: ChatView(
            chatController: chatController,
            // onSendTap: () {},
            chatViewState: ChatViewState
                .hasMessages, // Add this state once data is available.
          ));
    }
  }
}
