import 'package:objectbox/objectbox.dart';

@Entity()
class Customer {
  int id = 0;
  @Index()
  final String identity;
  final String name;
  final String phone;

  Customer({required this.identity, required this.name, required this.phone});

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      identity: json['id'],
      name: json['name'],
      phone: json['phone'],
    );
  }
}
