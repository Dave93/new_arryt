import 'package:arryt/models/customer.dart';
import 'package:arryt/models/new_order.dart';
import 'package:arryt/models/order.dart';
import 'package:arryt/models/order_status.dart';
import 'package:arryt/models/organizations.dart';
import 'package:arryt/models/terminals.dart';

/// Mock data for testing - only used in debug mode
class MockData {
  static List<OrderModel> getMockOrders() {
    List<OrderModel> orders = [];

    // Mock Order 1
    OrderModel order1 = OrderModel(
      identity: 'mock-order-001',
      order_number: '10001',
      order_price: 85000,
      delivery_price: 15000,
      to_lat: 41.311081,
      to_lon: 69.240562,
      from_lat: 41.299496,
      from_lon: 69.240074,
      pre_distance: 2.5,
      created_at: DateTime.now().subtract(const Duration(minutes: 15)),
      delivery_address: 'ул. Амира Темура, 108, кв. 25',
      delivery_comment: 'Позвонить за 5 минут',
      paymentType: 'cash',
      house: '108',
      entrance: '2',
      flat: '25',
    );
    order1.customer.target = Customer(
      identity: 'cust-001',
      name: 'Алишер Каримов',
      phone: '+998901234567',
    );
    order1.terminal.target = Terminals(
      identity: 'term-001',
      name: 'Evos Chilanzar',
    );
    order1.orderStatus.target = OrderStatus(
      identity: 'status-001',
      name: 'В пути',
      cancel: false,
      finish: false,
      onWay: true,
    );
    order1.organization.target = Organizations(
      'org-001',
      'Evos',
      true,
      '',
      'Fast Food',
      10,
      5,
      100,
      '',
    );
    orders.add(order1);

    // Mock Order 2
    OrderModel order2 = OrderModel(
      identity: 'mock-order-002',
      order_number: '10002',
      order_price: 120000,
      delivery_price: 20000,
      to_lat: 41.328650,
      to_lon: 69.255821,
      from_lat: 41.311151,
      from_lon: 69.279737,
      pre_distance: 4.2,
      created_at: DateTime.now().subtract(const Duration(minutes: 30)),
      delivery_address: 'ул. Бабура, 45',
      delivery_comment: 'Код домофона: 1234',
      paymentType: 'card',
      house: '45',
      entrance: '1',
      flat: '12',
      additional_phone: '+998931112233',
    );
    order2.customer.target = Customer(
      identity: 'cust-002',
      name: 'Мадина Рахимова',
      phone: '+998977654321',
    );
    order2.terminal.target = Terminals(
      identity: 'term-002',
      name: 'Max Way Sergeli',
    );
    order2.orderStatus.target = OrderStatus(
      identity: 'status-002',
      name: 'Готовится',
      cancel: false,
      finish: false,
      onWay: false,
    );
    order2.organization.target = Organizations(
      'org-002',
      'Max Way',
      true,
      '',
      'Burgers & More',
      15,
      3,
      150,
      '',
    );
    orders.add(order2);

    // Mock Order 3
    OrderModel order3 = OrderModel(
      identity: 'mock-order-003',
      order_number: '10003',
      order_price: 65000,
      delivery_price: 12000,
      to_lat: 41.295695,
      to_lon: 69.212345,
      from_lat: 41.285123,
      from_lon: 69.198765,
      pre_distance: 1.8,
      created_at: DateTime.now().subtract(const Duration(minutes: 5)),
      delivery_address: 'ул. Навои, 22, офис 305',
      delivery_comment: 'Бизнес центр, 3 этаж',
      paymentType: 'cash',
      house: '22',
      flat: '305',
    );
    order3.customer.target = Customer(
      identity: 'cust-003',
      name: 'Бобур Юсупов',
      phone: '+998905556677',
    );
    order3.terminal.target = Terminals(
      identity: 'term-003',
      name: 'Oqtepa Lavash Yunusabad',
    );
    order3.orderStatus.target = OrderStatus(
      identity: 'status-003',
      name: 'Новый',
      cancel: false,
      finish: false,
      onWay: false,
    );
    order3.organization.target = Organizations(
      'org-003',
      'Oqtepa Lavash',
      true,
      '',
      'National Food',
      8,
      4,
      80,
      '',
    );
    orders.add(order3);

    return orders;
  }

  static List<NewOrderModel> getMockWaitingOrders() {
    List<NewOrderModel> orders = [];

    // Mock Waiting Order 1
    NewOrderModel order1 = NewOrderModel(
      id: 'mock-waiting-001',
      order_number: '20001',
      order_price: 95000,
      delivery_price: 18000,
      to_lat: 41.315081,
      to_lon: 69.248562,
      from_lat: 41.302496,
      from_lon: 69.245074,
      pre_distance: 3.1,
      created_at: DateTime.now().subtract(const Duration(minutes: 2)),
      delivery_address: 'ул. Шота Руставели, 55',
      delivery_comment: 'Домофон не работает, позвонить',
      paymentType: 'cash',
      house: '55',
      entrance: '3',
      flat: '18',
      customer: NewOrderCustomer(
        id: 'cust-w-001',
        name: 'Джамшид Ахмедов',
        phone: '+998901112233',
      ),
      terminal: NewOrderTerminals(
        id: 'term-w-001',
        name: 'Evos Mirzo Ulugbek',
      ),
      orderStatus: NewOrderStatus(
        id: 'status-w-001',
        name: 'Новый',
        cancel: false,
        finish: false,
      ),
      orderNextButton: [
        NewOrderOrderNextButton(
          id: 'btn-accept',
          name: 'Принять',
          sort: 1,
          finish: false,
          cancel: false,
          waiting: false,
          onWay: false,
          inTerminal: true,
        ),
      ],
      organization: NewOrderOrganizations(
        'org-w-001',
        'Evos',
        true,
        '',
        'Fast Food',
        10,
        5,
        100,
        '',
      ),
    );
    orders.add(order1);

    // Mock Waiting Order 2
    NewOrderModel order2 = NewOrderModel(
      id: 'mock-waiting-002',
      order_number: '20002',
      order_price: 78000,
      delivery_price: 15000,
      to_lat: 41.322650,
      to_lon: 69.265821,
      from_lat: 41.308151,
      from_lon: 69.272737,
      pre_distance: 2.8,
      created_at: DateTime.now().subtract(const Duration(minutes: 5)),
      delivery_address: 'ул. Мукими, 12',
      delivery_comment: '',
      paymentType: 'card',
      house: '12',
      entrance: '1',
      flat: '45',
      additional_phone: '+998997778899',
      customer: NewOrderCustomer(
        id: 'cust-w-002',
        name: 'Саида Каримова',
        phone: '+998935554433',
      ),
      terminal: NewOrderTerminals(
        id: 'term-w-002',
        name: 'Max Way Chilanzar',
      ),
      orderStatus: NewOrderStatus(
        id: 'status-w-002',
        name: 'Новый',
        cancel: false,
        finish: false,
      ),
      orderNextButton: [
        NewOrderOrderNextButton(
          id: 'btn-accept-2',
          name: 'Принять',
          sort: 1,
          finish: false,
          cancel: false,
          waiting: false,
          onWay: false,
          inTerminal: true,
        ),
      ],
      organization: NewOrderOrganizations(
        'org-w-002',
        'Max Way',
        true,
        '',
        'Burgers & More',
        15,
        3,
        150,
        '',
      ),
    );
    orders.add(order2);

    // Mock Waiting Order 3
    NewOrderModel order3 = NewOrderModel(
      id: 'mock-waiting-003',
      order_number: '20003',
      order_price: 145000,
      delivery_price: 22000,
      to_lat: 41.298695,
      to_lon: 69.222345,
      from_lat: 41.288123,
      from_lon: 69.205765,
      pre_distance: 4.5,
      created_at: DateTime.now().subtract(const Duration(minutes: 8)),
      delivery_address: 'ул. Богибустон, 88, кв. 12',
      delivery_comment: 'Бизнес ланч, побыстрее пожалуйста',
      paymentType: 'cash',
      house: '88',
      flat: '12',
      customer: NewOrderCustomer(
        id: 'cust-w-003',
        name: 'Анвар Сафаров',
        phone: '+998909998877',
      ),
      terminal: NewOrderTerminals(
        id: 'term-w-003',
        name: 'Oqtepa Lavash Sergeli',
      ),
      orderStatus: NewOrderStatus(
        id: 'status-w-003',
        name: 'Новый',
        cancel: false,
        finish: false,
      ),
      orderNextButton: [
        NewOrderOrderNextButton(
          id: 'btn-accept-3',
          name: 'Принять',
          sort: 1,
          finish: false,
          cancel: false,
          waiting: false,
          onWay: false,
          inTerminal: true,
        ),
      ],
      organization: NewOrderOrganizations(
        'org-w-003',
        'Oqtepa Lavash',
        true,
        '',
        'National Food',
        8,
        4,
        80,
        '',
      ),
    );
    orders.add(order3);

    return orders;
  }
}
