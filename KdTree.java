import java.awt.geom.Point2D;
import java.util.Comparator;
import java.util.List;

public record KdTree (Point2D p, KdTree left, KdTree right) {
    public static KdTree build (List<Point2D> points) {
	return build (points, 0);
    }

    private static KdTree build (List<Point2D> points, int depth) {
	// base case
	if (points == null || points.isEmpty ()) {
	    return null;
	}

	// recursive case
	points.sort (depth % 2 == 0 ? SORT_ON_X : SORT_ON_Y);
	int n = points.size ();
	int midIdx = n / 2;
	Point2D midPoint = points.get (midIdx);

	return new KdTree (midPoint, build (points.subList (0, midIdx), depth + 1),
			   build (points.subList (midIdx + 1, n), depth + 1));
    }

    private static final Comparator<Point2D> SORT_ON_X = Comparator.comparingDouble (Point2D::getX);
    private static final Comparator<Point2D> SORT_ON_Y = Comparator.comparingDouble (Point2D::getY);
}
