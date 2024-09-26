import 'package:flutter/material.dart';

class OrderAcceptSliderBanner extends StatefulWidget {
  final String orderId;
  final Function(bool) onSlideComplete;

  OrderAcceptSliderBanner(
      {required this.orderId, required this.onSlideComplete});

  @override
  _OrderAcceptSliderBannerState createState() =>
      _OrderAcceptSliderBannerState();
}

class _OrderAcceptSliderBannerState extends State<OrderAcceptSliderBanner> {
  double _dragPosition = 0;
  bool _isDragging = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      color: Colors.grey[200],
      child: Stack(
        children: [
          Positioned.fill(
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    color: Colors.green,
                    child: Center(
                      child: Text('Принять',
                          style: TextStyle(color: Colors.white)),
                    ),
                  ),
                ),
                Expanded(
                  child: Container(
                    color: Colors.red,
                    child: Center(
                      child: Text('Отклонить',
                          style: TextStyle(color: Colors.white)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: _dragPosition,
            top: 0,
            bottom: 0,
            child: GestureDetector(
              onHorizontalDragStart: (_) => _isDragging = true,
              onHorizontalDragUpdate: (details) {
                if (_isDragging) {
                  setState(() {
                    _dragPosition += details.delta.dx;
                    _dragPosition = _dragPosition.clamp(
                        0, MediaQuery.of(context).size.width - 100);
                  });
                }
              },
              onHorizontalDragEnd: (_) {
                _isDragging = false;
                if (_dragPosition > MediaQuery.of(context).size.width / 2) {
                  widget.onSlideComplete(true); // Принять
                } else if (_dragPosition <
                    MediaQuery.of(context).size.width / 2 - 100) {
                  widget.onSlideComplete(false); // Отклонить
                } else {
                  setState(() {
                    _dragPosition = 0;
                  });
                }
              },
              child: Container(
                width: 100,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Center(
                  child: Icon(Icons.arrow_forward),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
