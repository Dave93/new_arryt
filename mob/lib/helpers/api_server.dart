import 'package:arryt/main.dart';
import 'package:arryt/models/api_client.dart';
import 'package:arryt/models/user_data.dart';
import 'package:dio/dio.dart';
import 'package:dio_http2_adapter/dio_http2_adapter.dart';

class ApiServer {
  static String url = 'https://newapi.arryt.uz';
  late Dio dio;

  // create constructor function
  ApiServer() {
    ApiClient? client = objectBox.getDefaultApiClient();
    if (client != null) {
      url = client.apiUrl;
    }

    dio = Dio()
      ..options.baseUrl = url
      ..httpClientAdapter = Http2Adapter(
        ConnectionManager(idleTimeout: Duration(seconds: 10)),
      );

    UserData? user = objectBox.getUserData();

    if (user != null) {
      dio.options.headers['Authorization'] = 'Bearer ${user.accessToken}';
    }

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
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
    return await dio.post(path, data: data);
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
