module app.mllopes.gestor {
    requires javafx.controls;
    requires javafx.fxml;
    requires javafx.graphics;
    requires javafx.web;
    requires javafx.media;
    requires java.sql;
    requires java.desktop;
    requires org.slf4j;
    requires com.fasterxml.jackson.databind;
    requires transitive java.naming;
    requires transitive java.logging;

    exports app.mllopes.gestor;
    exports app.mllopes.gestor.core;
    exports app.mllopes.gestor.ui;
    opens app.mllopes.gestor.ui to javafx.fxml;
    opens app.mllopes.gestor to javafx.graphics;
}
