import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:auto_size_text/auto_size_text.dart';
// import 'package:chat_package/views/componants/chat_input_feild.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:group_button/group_button.dart';

import '../../main.dart';

class CancelOrderModal extends StatefulWidget {
  final String orderId;
  final String orderStatusId;
  const CancelOrderModal({
    Key? key,
    required this.orderId,
    required this.orderStatusId,
  }) : super(key: key);

  @override
  State<CancelOrderModal> createState() => _CancelOrderModalState();
}

class _CancelOrderModalState extends State<CancelOrderModal> {
  String cancelReason = '';

  Future<void> cancelOrderByText(String text) async {
    ApiServer api = ApiServer();

    var response = await api.post("/api/orders/${widget.orderId}/cancel", {
      'text': text,
    });

    if (response.statusCode != 200) {
      return AnimatedSnackBar.material(
        response.data['message'] ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    } else {
      objectBox.deleteCurrentOrder(widget.orderId);

      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
        child: Padding(
      padding: const EdgeInsets.all(10.0),
      child: Column(
        mainAxisSize: MainAxisSize.max,
        children: [
          const SizedBox(
            height: 40,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: AutoSizeText(
                  AppLocalizations.of(context)!
                      .setCancelReasonLabel
                      .toUpperCase(),
                  maxLines: 4,
                  style: const TextStyle(
                      fontSize: 25, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              )
            ],
          ),
          const Spacer(),
          GroupButton<String>(
            isRadio: true,
            options: const GroupButtonOptions(
                unselectedTextStyle: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black)),
            buttons: const [
              "Передумал клиент",
              "Не отвечает на звонок",
              "Опоздали с заказом"
            ],
            onSelected: (val, index, isSelected) async {
              cancelOrderByText(val);
            },
          ),
          const Spacer(),
          /*KeyboardVisibilityProvider(
            child: ChatInputField(
              sendMessageHintText:
                  AppLocalizations.of(context)!.commentFieldLabel.toUpperCase(),
              imageAttachmentFromGalary: AppLocalizations.of(context)!
                  .chooseImageFromGallery
                  .toUpperCase(),
              imageAttachmentFromCamery: AppLocalizations.of(context)!
                  .chooseImageFromCamery
                  .toUpperCase(),
              imageAttachmentCancelText: AppLocalizations.of(context)!
                  .imageAttachmentCancelText
                  .toUpperCase(),
              imageAttachmentTextColor: Theme.of(context).primaryColor,
              containerColor: const Color(0xFFCFD8DC),
              recordinNoteHintText: 'Now Recording',
              disableInput: false,
              handleRecord: (source, canceled) async {
                if (!canceled && source != null) {
                  var query = r'''
                    mutation($orderStatusId: String!, $orderId: String!, $file: Upload!) {
                      cancelOrderByVoice(orderStatusId: $orderStatusId, orderId: $orderId, file: $file) {
                        id
                        to_lat
                        to_lon
                        from_lat
                        from_lon
                        pre_distance
                        order_number
                        order_price
                        delivery_price
                        delivery_address
                        delivery_comment
                        created_at
                        payment_type
                        orders_organization {
                          id
                          name
                          icon_url
                          active
                          external_id
                          support_chat_url
                        }
                        orders_customers {
                          id
                          name
                          phone
                        }
                        orders_terminals {
                          id
                          name
                        }
                        orders_order_status {
                          id
                          name
                          cancel
                          finish
                          on_way
                          in_terminal
                        }
                        next_buttons {
                          name
                          id
                          color
                          sort
                          finish
                          waiting
                          cancel
                          on_way
                          in_terminal
                        }
                      }
                    }
                  ''';
                  var multipartFile = await MultipartFile.fromPath(
                      'file', source,
                      contentType: MediaType("audio", "m4a"));
                  var opts = MutationOptions(
                    document: gql(query),
                    variables: {
                      "file": multipartFile,
                      'orderStatusId': widget.orderStatusId,
                      'orderId': widget.orderId,
                    },
                  );
                  var client = GraphQLProvider.of(context).value;

                  var result = await client.mutate(opts);
                  if (result.hasException) {
                    AnimatedSnackBar.material(
                      result.exception?.graphqlErrors[0].message ?? "Error",
                      type: AnimatedSnackBarType.error,
                    ).show(context);
                    print(result.exception);
                  } else {
                    if (result.data != null) {
                      var order = result.data!['cancelOrderByVoice'];
                      OrderStatus orderStatus = OrderStatus(
                        identity: order['orders_order_status']['id'],
                        name: order['orders_order_status']['name'],
                        cancel: order['orders_order_status']['cancel'],
                        finish: order['orders_order_status']['finish'],
                      );
                      Terminals terminals = Terminals(
                        identity: order['orders_terminals']['id'],
                        name: order['orders_terminals']['name'],
                      );
                      Customer customer = Customer(
                        identity: order['orders_customers']['id'],
                        name: order['orders_customers']['name'],
                        phone: order['orders_customers']['phone'],
                      );
                      Organizations organizations = Organizations(
                          order['orders_organization']['id'],
                          order['orders_organization']['name'],
                          order['orders_organization']['active'],
                          order['orders_organization']['icon_url'],
                          order['orders_organization']['description'],
                          order['orders_organization']['max_distance'],
                          order['orders_organization']['max_active_orderCount'],
                          order['orders_organization']
                              ['max_order_close_distance'],
                          order['orders_organization']['support_chat_url']);
                      OrderModel orderModel = OrderModel.fromMap(order);
                      orderModel.customer.target = customer;
                      orderModel.terminal.target = terminals;
                      orderModel.orderStatus.target = orderStatus;
                      orderModel.organization.target = organizations;
                      if (order['next_buttons'] != null) {
                        order['next_buttons'].forEach((button) {
                          OrderNextButton orderNextButton =
                              OrderNextButton.fromMap(button);
                          orderModel.orderNextButton.add(orderNextButton);
                        });
                      }
                      objectBox.updateCurrentOrder(widget.orderId, orderModel);
                      Navigator.of(context).pop();
                    }
                  }
                }
              },
              handleImageSelect: (file) async {},
              onSlideToCancelRecord: () {},
              onSubmit: (text) {
                if (text != null) {
                  cancelOrderByText(text);
                }
              },
              textController: TextEditingController(),
            ),
          ),*/
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GestureDetector(
                onTap: () {
                  Navigator.of(context).pop();
                },
                child: Container(
                  height: 50,
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(50),
                      color: Theme.of(context).primaryColor),
                  child: const Center(
                      child: Text(
                    'ЗАКРЫТЬ',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white),
                  )),
                ),
              )
            ],
          ),
        ],
      ),
    ));
  }
}
