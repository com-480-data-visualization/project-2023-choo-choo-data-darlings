version := "0.1.0-SNAPSHOT"


scalaVersion := "2.11.12"
val sparkVersion = "2.4.8"

libraryDependencies += "org.apache.spark" %% "spark-core" % sparkVersion

libraryDependencies += "org.apache.spark" %% "spark-mllib" % sparkVersion

libraryDependencies +=  "org.scalaj" %% "scalaj-http" % "2.3.0"

libraryDependencies ++= Seq("org.slf4j" % "slf4j-api" % "1.7.13",
  "org.slf4j" % "slf4j-log4j12" % "1.7.13")

libraryDependencies += "org.scalactic" %% "scalactic" % "3.1.1"

//libraryDependencies += "org.scalatest" %% "scalatest" % "3.1.1" % Test

//libraryDependencies ++= Seq(
//  "junit" % "junit" % "4.8.1" % "test"
//)
libraryDependencies += "org.junit.jupiter" % "junit-jupiter-api" % "5.3.1" % Test
libraryDependencies += "org.junit.jupiter" % "junit-jupiter-params" % "5.3.1" % Test

// junit tests (invoke with `sbt test`)
libraryDependencies += "com.novocode" % "junit-interface" % "0.11" % "test"

//libraryDependencies += "net.aichler" % "jupiter-interface" % JupiterKeys.jupiterVersion.value % Test

