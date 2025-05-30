import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

class CallCenterWebView extends StatefulWidget {
  final String url;
  const CallCenterWebView({super.key, required this.url});

  @override
  State<CallCenterWebView> createState() => _CallCenterWebViewState();
}

class _CallCenterWebViewState extends State<CallCenterWebView> {
  final GlobalKey webViewKey = GlobalKey();

  InAppWebViewController? webViewController;
  // InAppWebViewSettings settings = InAppWebViewSettings(
  //     useShouldOverrideUrlLoading: true,
  //     mediaPlaybackRequiresUserGesture: false,
  //     allowsInlineMediaPlayback: true,
  //     iframeAllow: "camera; microphone",
  //     iframeAllowFullscreen: true);

  PullToRefreshController? pullToRefreshController;
  String url = "";
  double progress = 0;
  final urlController = TextEditingController();

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    // pullToRefreshController = kIsWeb
    //     ? null
    //     : PullToRefreshController(
    //         settings: PullToRefreshSettings(
    //           color: Colors.blue,
    //         ),
    //         onRefresh: () async {
    //           if (defaultTargetPlatform == TargetPlatform.android) {
    //             webViewController?.reload();
    //           } else if (defaultTargetPlatform == TargetPlatform.iOS) {
    //             webViewController?.loadUrl(
    //                 urlRequest:
    //                     URLRequest(url: await webViewController?.getUrl()));
    //           }
    //         },
    //       );
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
          child: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                SizedBox()
                // InAppWebView(
                //   key: webViewKey,
                //   initialUrlRequest: URLRequest(url: WebUri(widget.url)),
                //   initialSettings: settings,
                //   pullToRefreshController: pullToRefreshController,
                //   onWebViewCreated: (controller) {
                //     webViewController = controller;
                //   },
                //   onLoadStart: (controller, url) {
                //     setState(() {
                //       this.url = url.toString();
                //       urlController.text = this.url;
                //     });
                //   },
                //   onPermissionRequest: (controller, request) async {
                //     return PermissionResponse(
                //         resources: request.resources,
                //         action: PermissionResponseAction.GRANT);
                //   },
                //   shouldOverrideUrlLoading:
                //       (controller, navigationAction) async {
                //     var uri = navigationAction.request.url!;

                //     if (![
                //       "http",
                //       "https",
                //       "file",
                //       "chrome",
                //       "data",
                //       "javascript",
                //       "about"
                //     ].contains(uri.scheme)) {
                //       if (await canLaunchUrl(uri)) {
                //         // Launch the App
                //         await launchUrl(
                //           uri,
                //         );
                //         // and cancel the request
                //         return NavigationActionPolicy.CANCEL;
                //       }
                //     }

                //     return NavigationActionPolicy.ALLOW;
                //   },
                //   onLoadStop: (controller, url) async {
                //     pullToRefreshController?.endRefreshing();
                //     setState(() {
                //       this.url = url.toString();
                //       urlController.text = this.url;
                //     });
                //   },
                //   onReceivedError: (controller, request, error) {
                //     pullToRefreshController?.endRefreshing();
                //   },
                //   onProgressChanged: (controller, progress) {
                //     if (progress == 100) {
                //       pullToRefreshController?.endRefreshing();
                //     }
                //     setState(() {
                //       this.progress = progress / 100;
                //       urlController.text = url;
                //     });
                //   },
                //   onUpdateVisitedHistory: (controller, url, androidIsReload) {
                //     setState(() {
                //       this.url = url.toString();
                //       urlController.text = this.url;
                //     });
                //   },
                //   onConsoleMessage: (controller, consoleMessage) {
                //     print(consoleMessage);
                //   },
                // ),
                // progress < 1.0
                //     ? LinearProgressIndicator(value: progress)
                //     : Container(),
              ],
            ),
          ),
          ButtonBar(alignment: MainAxisAlignment.center, children: <Widget>[
            GestureDetector(
              onTap: () {
                Navigator.of(context).pop();
              },
              child: Container(
                height: 50,
                width: MediaQuery.of(context).size.width * 0.8,
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
          ])
        ],
      )),
    );
  }
}
