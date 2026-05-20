package vn.edu.webphim.data;

import vn.edu.webphim.model.Movie;
import java.util.ArrayList;
import java.util.List;

public class MockData {
    private static final List<Movie> movies = new ArrayList<>();

    // Dữ liệu giả lập 3 bộ phim
    static {
        movies.add(new Movie(
            1, 
            "Big Buck Bunny", 
            "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg", 
            "Một chú thỏ mập mạp, đáng yêu đối mặt với sự trêu chọc của ba chú gặm nhấm tinh nghịch. Phim hoạt hình kinh điển mã nguồn mở từ Blender Foundation.", 
            "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        ));
        
        movies.add(new Movie(
            2, 
            "Sintel", 
            "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Sintel_poster.jpg/800px-Sintel_poster.jpg", 
            "Hành trình đầy cảm động của Sintel, một cô gái trẻ đi tìm kiếm chú rồng nhỏ đã từng được cô cứu giúp. Một tác phẩm CGI tuyệt đẹp.", 
            "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
        ));
        
        movies.add(new Movie(
            3, 
            "Tears of Steel", 
            "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg", 
            "Tears of Steel là một bộ phim khoa học viễn tưởng ngắn với bối cảnh tương lai hậu tận thế tại Amsterdam, nơi con người và robot đối đầu.", 
            "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
        ));
    }

    // Lấy toàn bộ danh sách phim
    public static List<Movie> getAllMovies() {
        return movies;
    }

    // Lấy chi tiết một bộ phim theo ID
    public static Movie getMovieById(int id) {
        for (Movie movie : movies) {
            if (movie.getId() == id) {
                return movie;
            }
        }
        return null;
    }
}
