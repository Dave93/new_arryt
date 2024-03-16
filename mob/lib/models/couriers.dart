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

  factory Couriers.fromMap(Map<String, dynamic> map) {
    return Couriers(
      identity: map['id'],
      firstName: map['first_name'],
      lastName: map['last_name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': identity,
      'first_name': firstName,
      'last_name': lastName,
    };
  }

  @override
  String toString() {
    return 'Couriers{id: $id, identity: $identity, firstName: $firstName, lastName: $lastName}';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Couriers &&
          runtimeType == other.runtimeType &&
          identity == other.identity &&
          firstName == other.firstName &&
          lastName == other.lastName;

  @override
  int get hashCode =>
      identity.hashCode ^ firstName.hashCode ^ lastName.hashCode;
}
