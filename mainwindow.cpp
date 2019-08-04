#include "mainwindow.h"
#include "ui_mainwindow.h"

MainWindow::MainWindow(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow)
{
    ui->setupUi(this);

    this->setWindowTitle("appSharedClipboard");

    QIcon oIcon(":/images/buffer_icon.png");

    this->setWindowIcon(oIcon);

    this->oTrayMenu = QSharedPointer<QMenu>::create(this);
    QAction *oShowHideAction = this->oTrayMenu->addAction("Show/Hide");
    connect(oShowHideAction, &QAction::triggered, this, &MainWindow::fnShowHide);

    this->oTrayMenu->addSeparator();

    QAction *oQuitAction = this->oTrayMenu->addAction("Quit");
    connect(oQuitAction, &QAction::triggered, this, &MainWindow::fnQuit);

    this->oTrayIcon = QSharedPointer<QSystemTrayIcon>::create(this);
    this->oTrayIcon->setIcon(oIcon);
    this->oTrayIcon->setContextMenu(this->oTrayMenu.data());

    connect(this->oTrayIcon.data(), &QSystemTrayIcon::activated, this, &MainWindow::fnIconActivated);

    this->oTrayIcon->show();
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::fnCloseEvent(QCloseEvent *event)
{
#ifdef Q_OS_OSX
    if (!event->spontaneous() || !isVisible()) {
        return;
    }
#endif
    if (this->oTrayIcon->isVisible()) {
        hide();
        event->ignore();
    }
}

void MainWindow::fnShowHide()
{
    this->setHidden(!this->isHidden());
}

void MainWindow::fnQuit()
{
    QApplication::quit();
}

void MainWindow::fnIconActivated(QSystemTrayIcon::ActivationReason reason)
{
    switch (reason) {
        case QSystemTrayIcon::Trigger:
        //case QSystemTrayIcon::DoubleClick:
            this->fnShowHide();
            break;
        case QSystemTrayIcon::MiddleClick:
            break;
    }
}
