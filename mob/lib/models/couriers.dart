import 'package:objectbox/objectbox.dart';

@Entity()
class Couriers {
  int id = 0;
  @Index()
  final String identity;
  final String firstName;
  final String lastName;

  Couriers(
      {required this.identity,
      required this.firstName,
      required this.lastName});

  factory Couriers.fromJson(Map<String, dynamic> json) {
    return Couriers(
      identity: json['id'],
      firstName: json['first_name'],
      lastName: json['last_name'],
    );
  }
}
