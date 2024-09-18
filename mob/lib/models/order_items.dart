// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class OrderItemsModel {
  final int productId;
  final int quantity;
  final String name;
  final int price;

  OrderItemsModel(
    this.productId,
    this.quantity,
    this.name,
    this.price,
  );

  OrderItemsModel copyWith({
    int? productId,
    int? quantity,
    String? name,
    int? price,
  }) {
    return OrderItemsModel(
      productId ?? this.productId,
      quantity ?? this.quantity,
      name ?? this.name,
      price ?? this.price,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'productId': productId,
      'quantity': quantity,
      'name': name,
      'price': price,
    };
  }

  factory OrderItemsModel.fromMap(Map<String, dynamic> map) {
    return OrderItemsModel(
      map['product_id'] as int,
      map['quantity'] as int,
      map['name'] as String,
      map['price'] as int,
    );
  }

  String toJson() => json.encode(toMap());

  factory OrderItemsModel.fromJson(String source) =>
      OrderItemsModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'OrderItemsModel(productId: $productId, quantity: $quantity, name: $name, price: $price)';
  }

  @override
  bool operator ==(covariant OrderItemsModel other) {
    if (identical(this, other)) return true;

    return other.productId == productId &&
        other.quantity == quantity &&
        other.name == name &&
        other.price == price;
  }

  @override
  int get hashCode {
    return productId.hashCode ^
        quantity.hashCode ^
        name.hashCode ^
        price.hashCode;
  }
}
