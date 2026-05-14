import 'dart:convert';

class Product {
  final String id;
  final String name;
  final double currentPrice;
  final bool isActive;
  final int createdAt;

  Product({
    required this.id,
    required this.name,
    required this.currentPrice,
    required this.isActive,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'currentPrice': currentPrice,
    'isActive': isActive,
    'createdAt': createdAt,
  };

  factory Product.fromMap(Map<String, dynamic> map) => Product(
    id: map['id'],
    name: map['name'],
    currentPrice: (map['currentPrice'] as num).toDouble(),
    isActive: map['isActive'],
    createdAt: map['createdAt'],
  );
}

class Salesman {
  final String id;
  final String name;
  final bool isActive;
  final int createdAt;

  Salesman({
    required this.id,
    required this.name,
    required this.isActive,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'isActive': isActive,
    'createdAt': createdAt,
  };

  factory Salesman.fromMap(Map<String, dynamic> map) => Salesman(
    id: map['id'],
    name: map['name'],
    isActive: map['isActive'],
    createdAt: map['createdAt'],
  );
}

class DispatchRecord {
  final String id;
  final String date;
  final String salesmanId;
  final String salesmanNameSnapshot;
  final String productId;
  final String productNameSnapshot;
  final int givenQuantity;
  final int? returnedQuantity;
  final int soldQuantity;
  final double priceSnapshot;
  final double amount;
  final int dispatchRound;

  DispatchRecord({
    required this.id,
    required this.date,
    required this.salesmanId,
    required this.salesmanNameSnapshot,
    required this.productId,
    required this.productNameSnapshot,
    required this.givenQuantity,
    this.returnedQuantity,
    required this.soldQuantity,
    required this.priceSnapshot,
    required this.amount,
    required this.dispatchRound,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'date': date,
    'salesmanId': salesmanId,
    'salesmanNameSnapshot': salesmanNameSnapshot,
    'productId': productId,
    'productNameSnapshot': productNameSnapshot,
    'givenQuantity': givenQuantity,
    'returnedQuantity': returnedQuantity,
    'soldQuantity': soldQuantity,
    'priceSnapshot': priceSnapshot,
    'amount': amount,
    'dispatchRound': dispatchRound,
  };

  factory DispatchRecord.fromMap(Map<String, dynamic> map) => DispatchRecord(
    id: map['id'],
    date: map['date'],
    salesmanId: map['salesmanId'],
    salesmanNameSnapshot: map['salesmanNameSnapshot'],
    productId: map['productId'],
    productNameSnapshot: map['productNameSnapshot'],
    givenQuantity: map['givenQuantity'],
    returnedQuantity: map['returnedQuantity'],
    soldQuantity: map['soldQuantity'],
    priceSnapshot: (map['priceSnapshot'] as num).toDouble(),
    amount: (map['amount'] as num).toDouble(),
    dispatchRound: map['dispatchRound'],
  );
}

class Settlement {
  final String id;
  final String date;
  final String salesmanId;
  final String salesmanNameSnapshot;
  final double totalAmount;
  final double commissionPercent;
  final double commissionAmount;
  final double netAmount;
  final bool settlementLocked;
  final int createdAt;

  Settlement({
    required this.id,
    required this.date,
    required this.salesmanId,
    required this.salesmanNameSnapshot,
    required this.totalAmount,
    required this.commissionPercent,
    required this.commissionAmount,
    required this.netAmount,
    required this.settlementLocked,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'date': date,
    'salesmanId': salesmanId,
    'salesmanNameSnapshot': salesmanNameSnapshot,
    'totalAmount': totalAmount,
    'commissionPercent': commissionPercent,
    'commissionAmount': commissionAmount,
    'netAmount': netAmount,
    'settlementLocked': settlementLocked,
    'createdAt': createdAt,
  };

  factory Settlement.fromMap(Map<String, dynamic> map) => Settlement(
    id: map['id'],
    date: map['date'],
    salesmanId: map['salesmanId'],
    salesmanNameSnapshot: map['salesmanNameSnapshot'],
    totalAmount: (map['totalAmount'] as num).toDouble(),
    commissionPercent: (map['commissionPercent'] as num).toDouble(),
    commissionAmount: (map['commissionAmount'] as num).toDouble(),
    netAmount: (map['netAmount'] as num).toDouble(),
    settlementLocked: map['settlementLocked'],
    createdAt: map['createdAt'],
  );
}

class PaymentRecord {
  final String id;
  final String date;
  final String salesmanId;
  final double amountPaid;
  final String? note;
  final int createdAt;

  PaymentRecord({
    required this.id,
    required this.date,
    required this.salesmanId,
    required this.amountPaid,
    this.note,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'date': date,
    'salesmanId': salesmanId,
    'amountPaid': amountPaid,
    'note': note,
    'createdAt': createdAt,
  };

  factory PaymentRecord.fromMap(Map<String, dynamic> map) => PaymentRecord(
    id: map['id'],
    date: map['date'],
    salesmanId: map['salesmanId'],
    amountPaid: (map['amountPaid'] as num).toDouble(),
    note: map['note'],
    createdAt: map['createdAt'],
  );
}
