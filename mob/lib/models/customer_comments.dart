// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class FileAsset {
  final String id;
  final String model;
  final String file_name;
  final String sub_folder;

  FileAsset(
    this.id,
    this.model,
    this.file_name,
    this.sub_folder,
  );

  FileAsset copyWith({
    String? id,
    String? model,
    String? file_name,
    String? sub_folder,
  }) {
    return FileAsset(
      id ?? this.id,
      model ?? this.model,
      file_name ?? this.file_name,
      sub_folder ?? this.sub_folder,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'model': model,
      'file_name': file_name,
      'sub_folder': sub_folder,
    };
  }

  factory FileAsset.fromMap(Map<String, dynamic> map) {
    return FileAsset(
      map['id'] as String,
      map['model'] as String,
      map['file_name'] as String,
      map['sub_folder'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory FileAsset.fromJson(String source) =>
      FileAsset.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'FileAsset(id: $id, model: $model, file_name: $file_name, sub_folder: $sub_folder)';
  }

  @override
  bool operator ==(covariant FileAsset other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.model == model &&
        other.file_name == file_name &&
        other.sub_folder == sub_folder;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        model.hashCode ^
        file_name.hashCode ^
        sub_folder.hashCode;
  }
}

class CustomerCommentsModel {
  final String id;
  final String? comment;
  final String customer_id;
  final DateTime created_at;
  final FileAsset? customers_comments_voice_idToassets;
  final FileAsset? customers_comments_image_idToassets;

  CustomerCommentsModel(
      {required this.id,
      required this.comment,
      required this.customer_id,
      required this.created_at,
      required this.customers_comments_voice_idToassets,
      required this.customers_comments_image_idToassets});

  CustomerCommentsModel copyWith(
      {String? id,
      String? comment,
      String? customer_id,
      DateTime? created_at,
      FileAsset? customers_comments_voice_idToassets,
      FileAsset? customers_comments_image_idToassets}) {
    return CustomerCommentsModel(
        id: id ?? this.id,
        comment: comment ?? this.comment,
        customer_id: customer_id ?? this.customer_id,
        created_at: created_at ?? this.created_at,
        customers_comments_voice_idToassets:
            customers_comments_voice_idToassets ??
                this.customers_comments_voice_idToassets,
        customers_comments_image_idToassets:
            customers_comments_image_idToassets ??
                this.customers_comments_image_idToassets);
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'comment': comment,
      'customer_id': customer_id,
      'created_at': created_at.millisecondsSinceEpoch,
      'customers_comments_voice_idToassets':
          customers_comments_voice_idToassets?.toMap(),
      'customers_comments_image_idToassets':
          customers_comments_image_idToassets?.toMap()
    };
  }

  factory CustomerCommentsModel.fromMap(Map<String, dynamic> map) {
    return CustomerCommentsModel(
        id: map['id'] as String,
        comment: map['comment'] != null ? map['comment'] as String : null,
        customer_id: map['customer_id'] as String,
        created_at: DateTime.parse(map['created_at'] as String),
        customers_comments_voice_idToassets:
            map['customers_comments_voice_idToassets'] != null
                ? FileAsset.fromMap(map['customers_comments_voice_idToassets'])
                : null,
        customers_comments_image_idToassets:
            map['customers_comments_image_idToassets'] != null
                ? FileAsset.fromMap(map['customers_comments_image_idToassets'])
                : null);
  }

  String toJson() => json.encode(toMap());

  factory CustomerCommentsModel.fromJson(String source) =>
      CustomerCommentsModel.fromMap(
          json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'CustomerCommentsModel(id: $id, comment: $comment, customer_id: $customer_id, created_at: $created_at)';
  }

  @override
  bool operator ==(covariant CustomerCommentsModel other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.comment == comment &&
        other.customer_id == customer_id &&
        other.created_at == created_at;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        comment.hashCode ^
        customer_id.hashCode ^
        created_at.hashCode;
  }
}
