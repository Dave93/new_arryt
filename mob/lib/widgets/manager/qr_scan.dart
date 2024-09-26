import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class ManagerShowQRCode extends StatelessWidget {
  const ManagerShowQRCode({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: const ManagerShowQRCodeView());
  }
}

class ManagerShowQRCodeView extends StatefulWidget {
  const ManagerShowQRCodeView({super.key});

  @override
  State<ManagerShowQRCodeView> createState() => _ManagerShowQRCodeViewState();
}

class _ManagerShowQRCodeViewState extends State<ManagerShowQRCodeView> {
  bool isLoading = false;
  String qrCode = '';

  Future<void> _loadQrCode() async {
    setState(() {
      isLoading = true;
    });
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query {
        getApiUrl
      }
    ''';
    var data = await client.query(
      QueryOptions(document: gql(query)),
    );
    setState(() {
      isLoading = false;
      qrCode = data.data?['getApiUrl'];
    });
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadQrCode();
    });
  }

  @override
  Widget build(BuildContext context) {
    return isLoading
        ? const Center(child: CircularProgressIndicator())
        : Center(child: Text('test'));
  }
}
