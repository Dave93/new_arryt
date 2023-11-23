import 'package:arryt/main.dart';
import 'package:arryt/models/api_client.dart';
import 'package:arryt/models/customer.dart';
import 'package:arryt/models/order.dart';
import 'package:arryt/models/order_status.dart';
import 'package:arryt/models/organizations.dart';
import 'package:arryt/models/terminals.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/objectbox.g.dart';
import 'package:arryt/router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

import '../models/manager_couriers_model.dart';
import '../models/waiting_order.dart';

class ObjectBox {
  // ObjectBox
  late final Store _store;
  late final Box<OrderModel> _currentOrdersBox;
  late final Box<OrderModel> _historyOrdersBox;
  late final Box<Customer> _customersBox;
  late final Box<WaitingOrderModel> _waitingOrdersBox;
  late final Box<OrderStatus> _orderStatusesBox;
  late final Box<Terminals> _terminalsBox;
  late final Box<Organizations> _organizationsBox;
  late final Box<ManagerCouriersModel> _managerCouriersBox;
  late final Box<ApiClient> _apiClientBox;
  late final Box<UserData> _userDataBox;

  ObjectBox._init(this._store) {
    _currentOrdersBox = Box<OrderModel>(_store);
    _historyOrdersBox = Box<OrderModel>(_store);
    _waitingOrdersBox = Box<WaitingOrderModel>(_store);
    _customersBox = Box<Customer>(_store);
    _orderStatusesBox = Box<OrderStatus>(_store);
    _terminalsBox = Box<Terminals>(_store);
    _organizationsBox = Box<Organizations>(_store);
    _managerCouriersBox = Box<ManagerCouriersModel>(_store);
    _apiClientBox = Box<ApiClient>(_store);
    _userDataBox = Box<UserData>(_store);
  }

  ObjectBox._internal();

  // Init
  static Future<ObjectBox> init() async {
    final docsDir = await getApplicationDocumentsDirectory();
    // Get the directory where the database file will be stored
    final store = await openStore(directory: p.join(docsDir.path, "arryt"));
    return ObjectBox._init(store);
  }

  Future<void> clearCurrentOrders() {
    _currentOrdersBox.removeAll();
    return Future.value();
  }

  Future<void> clearWaitingOrders() {
    _waitingOrdersBox.removeAll();
    return Future.value();
  }

  Future<void> clearHistoryOrders() {
    _historyOrdersBox.removeAll();
    return Future.value();
  }

  void addCurrentOrders(List<OrderModel> orders) {
    for (var element in orders) {
      final query = _currentOrdersBox
          .query(OrderModel_.identity.equals(element.identity))
          .build();
      query.remove();
    }
    _currentOrdersBox.putMany(orders);
  }

  void addWaitingOrders(List<WaitingOrderModel> orders) {
    for (var element in orders) {
      final query = _waitingOrdersBox
          .query(WaitingOrderModel_.identity.equals(element.identity))
          .build();
      query.remove();
    }
    _waitingOrdersBox.putMany(orders);
  }

  void addHistoryOrders(List<OrderModel> orders) {
    for (var element in orders) {
      final query = _historyOrdersBox
          .query(OrderModel_.identity.equals(element.identity))
          .build();
      query.remove();
    }
    _historyOrdersBox.putMany(orders);
  }

  void appendHistoryOrders(List<OrderModel> orders) {
    _historyOrdersBox.putMany(orders);
  }

  Stream<List<OrderModel>> getCurrentOrders() {
    final builder = _currentOrdersBox.query()..order(OrderModel_.created_at);
    return builder.watch(triggerImmediately: true).map((query) {
      return query.find();
    });
  }

  Stream<List<WaitingOrderModel>> getWaitingOrders() {
    final builder = _waitingOrdersBox.query()
      ..order(WaitingOrderModel_.created_at);
    return builder.watch(triggerImmediately: true).map((query) {
      return query.find();
    });
  }

  Stream<List<OrderModel>> getHistoryOrders() {
    final builder = _historyOrdersBox.query()
      ..order(OrderModel_.created_at, flags: Order.descending);
    return builder.watch(triggerImmediately: true).map((query) {
      return query.find();
    });
  }

  Future<void> deleteCurrentOrder(String identity) {
    final query =
        _currentOrdersBox.query(OrderModel_.identity.equals(identity)).build();
    query.remove();
    return Future.value();
  }

  Future<void> deleteWaitingOrder(String identity) {
    final query = _waitingOrdersBox
        .query(WaitingOrderModel_.identity.equals(identity))
        .build();
    query.remove();
    return Future.value();
  }

  Future<void> updateCurrentOrder(String identity, OrderModel order) {
    final query =
        _currentOrdersBox.query(OrderModel_.identity.equals(identity)).build();
    query.remove();

    if (order.orderStatus.target != null &&
        (!order.orderStatus.target!.cancel &&
            !order.orderStatus.target!.finish)) {
      _currentOrdersBox.put(order);
    }

    return Future.value();
  }

  void addManagerCouriers(List<ManagerCouriersModel> couriers) {
    _managerCouriersBox.removeAll();
    _managerCouriersBox.putMany(couriers);
  }

  Stream<List<ManagerCouriersModel>> getManagerCouriers() {
    final builder = _managerCouriersBox.query()
      ..order(ManagerCouriersModel_.balance, flags: Order.descending);
    return builder.watch(triggerImmediately: true).map((query) {
      return query.find();
    });
  }

  Future<int> getHistoryOrdersCount() async {
    return _historyOrdersBox.count();
  }

  ApiClient? getDefaultApiClient() {
    final query = _apiClientBox
        .query(ApiClient_.isServiceDefault.equals(true))
        .build()
      ..limit = 1;
    return query.findFirst();
  }

  Stream<ApiClient> getDefaultApiClientStream() {
    final builder =
        _apiClientBox.query(ApiClient_.isServiceDefault.equals(true));
    return builder.watch(triggerImmediately: true).map((query) {
      return query.findFirst()!;
    });
  }

  void setDefaultApiClient(ApiClient apiClient) {
    final query = _apiClientBox
        .query(ApiClient_.isServiceDefault.equals(true))
        .build()
      ..limit = 1;
    final oldApiClient = query.findFirst();
    if (oldApiClient != null) {
      oldApiClient.isServiceDefault = false;
      _apiClientBox.put(oldApiClient);
    }
    apiClient.isServiceDefault = true;
    _apiClientBox.put(apiClient);
  }

  UserData? getUserData() {
    final query = _userDataBox.query().build()..limit = 1;
    return query.findFirst();
  }

  void setUserData(UserData userData) {
    _userDataBox.removeAll();
    _userDataBox.put(userData);
  }

  void deleteUserData() {
    _userDataBox.removeAll();
    getIt<AppRouter>().replace(LoginTypePhoneRoute());
  }

  bool isUserDataExist() {
    final query = _userDataBox.query().build()..limit = 1;
    return query.findFirst() != null;
  }

  Stream<List<UserData>> getUserDataStream() {
    final builder = _userDataBox.query();
    return builder.watch(triggerImmediately: true).map((query) {
      return query.find();
    });
  }
}
