import 'dart:convert';

import 'package:arryt/main.dart';
import 'package:arryt/models/api_client.dart';
import 'package:arryt/models/user_data.dart';
import 'package:dio/dio.dart';
import 'package:dio_http2_adapter/dio_http2_adapter.dart';
import 'package:http/http.dart' as http;
import 'package:arryt/helpers/hive_helper.dart';

class ApiServer {
  static String url = 'https://newapi.arryt.uz';
  late Dio dio;

  // create constructor function
  ApiServer() {
    ApiClient? client = HiveHelper.getDefaultApiClient();
    if (client != null) {
      url = "https://" + client.apiUrl;
    }

    dio = Dio()
      ..options.baseUrl = url
      ..httpClientAdapter = Http2Adapter(
        ConnectionManager(idleTimeout: Duration(seconds: 10)),
      );

    UserData? user = HiveHelper.getUserData();
    if (user != null) {
      print(user.accessToken);

      dio.options.headers['Authorization'] = 'Bearer ${user.accessToken}';
    }

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest:
            (RequestOptions options, RequestInterceptorHandler handler) async {
          if (options.headers.containsKey('Authorization')) {
            UserData? user = HiveHelper.getUserData();
            if (user!.tokenExpires.isBefore(DateTime.now())) {
              try {
                var response = await http.post(
                  Uri.parse("${options.baseUrl}/api/users/refresh_token"),
                  headers: {'Content-Type': 'application/json'},
                  body: '{"refresh_token": "${user.refreshToken}"}',
                );
                if (response.statusCode == 200) {
                  var result = jsonDecode(response.body);
                  if (result['errors'] == null) {
                    var data = result;
                    HiveHelper.setUserDataToken(
                        data['accessToken'],
                        data['refreshToken'],
                        data['accessTokenExpires'],
                        DateTime.now().add(Duration(
                            hours: int.parse(
                                data['accessTokenExpires'].split('h')[0]))));
                    options.headers['Authorization'] =
                        'Bearer ${data['accessToken']}';
                  }
                }
              } catch (e) {
                print(e);
              }
            }
          }

          // Do something before request is sent.
          // If you want to resolve the request with custom data,
          // you can resolve a `Response` using `handler.resolve(response)`.
          // If you want to reject the request with a error message,
          // you can reject with a `DioException` using `handler.reject(dioError)`.
          return handler.next(options);
        },
        onResponse: (Response response, ResponseInterceptorHandler handler) {
          // Do something with response data.
          // If you want to reject the request with a error message,
          // you can reject a `DioException` object using `handler.reject(dioError)`.
          return handler.next(response);
        },
        onError: (DioException e, ErrorInterceptorHandler handler) {
          // Do something with response error.
          // If you want to resolve the request with some custom data,
          // you can resolve a `Response` object using `handler.resolve(response)`.
          return handler.next(e);
        },
      ),
    );
  }

  // create function for get request
  Future<Response> get(String path, Map<String, dynamic>? params) async {
    try {
      final response = await dio.get(path, queryParameters: params);
      return response;
    } catch (e) {
      throw DioException(
          error: e.toString(), requestOptions: RequestOptions(path: path));
    }
  }

  // create function for post request
  Future<Response> post(String path, Map<String, dynamic> data) async {
    try {
      final response = await dio.post(path, data: data);
      return response;
    } on DioException catch (e) {
      String message = e.toString();
      if (e.response != null && e.response!.data != null) {
        if (e.response!.data is Map<String, dynamic>) {
          // Here you can handle the case where e.response!.data is a Map<String, dynamic>
          // For example, extracting a specific message:
          var responseData = e.response!.data as Map<String, dynamic>;
          if (responseData.containsKey('message')) {
            message = responseData['message'];
          }
        } else {
          message = e.response!.data;
        }
      }

      throw DioException(
          error: message, requestOptions: RequestOptions(path: path));
    }
  }

  // create function for put request
  Future<Response> put(String path, Map<String, dynamic> data) async {
    return await dio.put(path, data: data);
  }

  // create function for delete request
  Future<Response> delete(String path) async {
    return await dio.delete(path);
  }

  // create function for patch request
  Future<Response> patch(String path, Map<String, dynamic> data) async {
    return await dio.patch(path, data: data);
  }

  // create function for head request
  Future<Response> head(String path) async {
    return await dio.head(path);
  }

  // create function for download request
  Future<Response> download(String path, String savePath) async {
    return await dio.download(path, savePath);
  }
}
