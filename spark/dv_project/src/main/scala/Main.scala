import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
object Main {

  def main(args: Array[String]): Unit = {
    // create a SparkSession
    val spark = SparkSession.builder()
      .appName("Read Parquet Example")
      .master("local[*]")
      .getOrCreate()

    // Get resources base path
    val resourcesPath = getClass.getResource("/").getPath

    // Read all parquet files in resources folder
    var data = spark.read.parquet(resourcesPath + "*.parquet").toDF()

    data = data
      // Add n_arrival_delay and n_departure_delay columns and drop corresponding delay columns
      .withColumn("n_arrival_delay", when(data("arrival_delay").isNull || data("arrival_delay") <= 0.0, 0).otherwise(1))
      .withColumn("n_departure_delay", when(data("departure_delay").isNull || data("departure_delay") <= 0.0, 0).otherwise(1))
      // Add n_cancelled and n_through_trip, n_additional_trip columns and drop corresponding boolean columns
      .withColumn("n_cancelled", when(data("is_cancelled"), 1).otherwise(0))
      .withColumn("n_through_trip", when(data("is_through_trip"), 1).otherwise(0))
      .withColumn("n_additional_trip", when(data("is_additional_trip"), 1).otherwise(0))
      .drop("is_cancelled")
      .drop("is_through_trip")
      .drop("is_additional_trip")
      // Delete arrival_forecast and departure_forecast columns
      .drop("arrival_forecast")
      .drop("departure_forecast")
      // Add generic n_entries column, it has value 1 for all rows
      .withColumn("n_entries", lit(1))
      // Remove the day from arrival_time and departure_time
      .withColumn("arrival_time", date_format(data("arrival_time"), "HH:mm:ss"))
      .withColumn("departure_time", date_format(data("departure_time"), "HH:mm:ss"))
      // Delete useless columns
      .drop(
        "__index_level_0__",
        "date",
        "arrival_forecast_status",
        "departure_forecast_status",
        "is_arrival_delayed",
        "is_departure_delayed"
      )
      // Group by identifier columns
      .groupBy("trip_id", "product_id", "line_text", "transport_type", "stop_id", "arrival_time", "departure_time")
      // Aggregate all columns
      // Get mean, median and standard deviation of arrival_delay and departure_delay
      .agg(
        mean("arrival_delay").as("mean_arrival_delay"),
        mean("departure_delay").as("mean_departure_delay"),
        expr("percentile_approx(arrival_delay, 0.5)").as("median_arrival_delay"),
        expr("percentile_approx(departure_delay, 0.5)").as("median_departure_delay"),
        stddev("arrival_delay").as("std_arrival_delay"),
        stddev("departure_delay").as("std_departure_delay"),

        sum("n_arrival_delay").as("n_arrival_delay"),
        sum("n_departure_delay").as("n_departure_delay"),
        sum("n_cancelled").as("n_cancelled"),
        sum("n_through_trip").as("n_through_trip"),
        sum("n_additional_trip").as("n_additional_trip"),
        sum("n_entries").as("n_entries")
      )
      .drop("arrival_delay")
      .drop("departure_delay")

    // Write data to parquet file
    data.repartition(1).write.parquet(resourcesPath + "output.parquet")
  }
}